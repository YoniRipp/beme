/**
 * Storage service — AWS S3 pre-signed URL generation.
 *
 * Frontend uploads directly to S3 (no server bandwidth used).
 * Pattern: client requests a signed URL → uploads directly to S3 → stores the public URL.
 *
 * Requires env vars: AWS_REGION, AWS_S3_BUCKET, plus AWS credentials
 * (AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY, or instance role).
 */
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { ValidationError } from '../errors.js';

const PRESIGNED_URL_EXPIRES_SECONDS = 300; // 5 minutes

function getS3Client() {
  if (!config.awsRegion || !config.awsS3Bucket) {
    throw new Error('AWS_REGION and AWS_S3_BUCKET must be configured for file uploads');
  }
  return new S3Client({ region: config.awsRegion });
}

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

/** Upload contexts and the MIME types each accepts — single source of upload policy. */
export const CONTEXT_MIME_TYPES: Record<string, readonly string[]> = {
  avatar: IMAGE_MIME_TYPES,
  workout: IMAGE_MIME_TYPES,
  food: IMAGE_MIME_TYPES,
  'exercise-video': VIDEO_MIME_TYPES,
};

const ALLOWED_MIME_TYPES = new Set(Object.values(CONTEXT_MIME_TYPES).flat());

/**
 * Every object a user uploads lives under this prefix, and **no database column records the
 * key** -- `controllers/uploads.ts` hands the URL to the client and the client is expected
 * to keep it on whichever record it belongs to. The prefix is therefore the only handle
 * account deletion has on a user's files, which is why the upload path and the deletion
 * sweep both derive it here instead of each spelling it out.
 */
export function userFilePrefix(userId: string): string {
  return `users/${userId}/`;
}

/**
 * Generate a pre-signed S3 PUT URL for a user file upload.
 * @param {string} userId
 * @param {string} mimeType - e.g. 'image/jpeg'
 * @param {'avatar'|'workout'|'food'} context - Where the file belongs
 * @returns {Promise<{ uploadUrl: string, fileUrl: string, key: string }>}
 */
export async function createPresignedUploadUrl(userId: string, mimeType: string, context: string = 'avatar') {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new ValidationError(`Unsupported file type: ${mimeType}. Allowed: JPEG, PNG, WebP, GIF, MP4, QuickTime, WebM`);
  }

  const ext = mimeType.split('/')[1].replace('jpeg', 'jpg');
  const uniqueId = crypto.randomBytes(8).toString('hex');
  const key = `${userFilePrefix(userId)}${context}/${uniqueId}.${ext}`;

  const s3 = getS3Client();
  const command = new PutObjectCommand({
    Bucket: config.awsS3Bucket,
    Key: key,
    ContentType: mimeType,
    // Files are stored private by default — serve through signed GET URLs or CloudFront
    CacheControl: 'max-age=31536000',
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: PRESIGNED_URL_EXPIRES_SECONDS });
  const fileUrl = `https://${config.awsS3Bucket}.s3.${config.awsRegion}.amazonaws.com/${key}`;

  return { uploadUrl, fileUrl, key };
}

/**
 * Delete a file from S3 by its key.
 * @param {string} key
 */
export async function deleteFile(key: string) {
  const s3 = getS3Client();
  await s3.send(new DeleteObjectCommand({ Bucket: config.awsS3Bucket, Key: key }));
}

/** ListObjectsV2 returns at most 1000 keys per page and DeleteObjects accepts at most 1000,
 *  so one listed page is exactly one delete batch and no re-chunking is needed. */
const S3_PAGE_SIZE = 1000;

/** Enough failing keys in the log line to diagnose, not enough to fill the log. */
const MAX_REPORTED_FAILURES = 5;

/**
 * Delete every object a user ever uploaded, by listing and emptying their key prefix.
 *
 * Nothing in the database records these keys (see `userFilePrefix`), so the prefix is the
 * whole handle. Idempotent and safely re-runnable: a second call lists nothing and deletes
 * nothing, which matters because account deletion calls this *after* the rows are gone --
 * if the sweep fails there is no longer a user row to retry from, only this prefix.
 *
 * Returns 0 without touching the network when S3 is not configured, which is the state in
 * dev and in CI; a deployment with no bucket has no objects to sweep.
 *
 * Per-object failures do not stop the sweep. S3 reports them inside an otherwise successful
 * 200, and there is no retry driver behind this call -- with the user row already gone,
 * whatever this pass leaves behind stays behind until somebody re-runs it by hand. So every
 * page is attempted, and the failures are collected and raised together at the end, rather
 * than one transient `SlowDown` on one key abandoning every page after it.
 *
 * @returns the number of objects deleted.
 * @throws when any object could not be deleted, after the whole prefix has been attempted.
 *   The count of objects that *were* deleted is on the error as `deleted`.
 */
export async function deleteUserFiles(userId: string): Promise<number> {
  if (!config.awsRegion || !config.awsS3Bucket) return 0;

  const prefix = userFilePrefix(userId);
  const s3 = getS3Client();
  let deleted = 0;
  const failures: string[] = [];
  let continuationToken: string | undefined;

  do {
    const page = await s3.send(
      new ListObjectsV2Command({
        Bucket: config.awsS3Bucket,
        Prefix: prefix,
        MaxKeys: S3_PAGE_SIZE,
        ContinuationToken: continuationToken,
      }),
    );

    const keys = (page.Contents ?? [])
      .map((object) => object.Key)
      .filter((key): key is string => typeof key === 'string' && key.length > 0);

    if (keys.length > 0) {
      const result = await s3.send(
        new DeleteObjectsCommand({
          Bucket: config.awsS3Bucket,
          Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
        }),
      );
      const errors = result.Errors ?? [];
      deleted += keys.length - errors.length;
      for (const error of errors) {
        failures.push(`${error.Key} (${error.Code}: ${error.Message})`);
      }
    }

    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);

  if (failures.length > 0) {
    throw Object.assign(
      new Error(
        `Failed to delete ${failures.length} object(s) under ${prefix} ` +
          `(${deleted} deleted): ${failures.slice(0, MAX_REPORTED_FAILURES).join('; ')}` +
          (failures.length > MAX_REPORTED_FAILURES ? ' …' : ''),
      ),
      { deleted },
    );
  }

  return deleted;
}
