import { describe, it, expect, vi, beforeEach } from 'vitest';

// `vi.mock` factories are hoisted above every top-level const, so anything they close over
// has to be created by `vi.hoisted` or it is still in its temporal dead zone when they run.
const { mockSend, config } = vi.hoisted(() => ({
  mockSend: vi.fn(),
  config: { awsRegion: 'eu-west-1', awsS3Bucket: 'trackvibe-test' } as {
    awsRegion?: string;
    awsS3Bucket?: string;
  },
}));

vi.mock('../config/index.js', () => ({ config }));

vi.mock('@aws-sdk/client-s3', () => {
  class Command {
    constructor(public readonly input: Record<string, unknown>) {}
  }
  return {
    S3Client: class {
      send = mockSend;
    },
    PutObjectCommand: class extends Command {},
    DeleteObjectCommand: class extends Command {},
    DeleteObjectsCommand: class DeleteObjectsCommand extends Command {},
    ListObjectsV2Command: class ListObjectsV2Command extends Command {},
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://signed.example/put'),
}));

import { createPresignedUploadUrl, deleteUserFiles, userFilePrefix } from './storage.js';

const USER_ID = 'user-1';

/** Names of the AWS command classes sent, in order. */
function sentCommands() {
  return mockSend.mock.calls.map(([command]) => command.constructor.name);
}

function inputsFor(commandName: string) {
  return mockSend.mock.calls
    .map(([command]) => command)
    .filter((command) => command.constructor.name === commandName)
    .map((command) => command.input);
}

describe('storage service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    config.awsRegion = 'eu-west-1';
    config.awsS3Bucket = 'trackvibe-test';
  });

  // The sweep and the upload path must derive the prefix from the same place, or a change to
  // one silently stops the other from finding anything.
  it('writes uploads under the same prefix the sweep empties', async () => {
    const { key } = await createPresignedUploadUrl(USER_ID, 'image/jpeg', 'avatar');

    expect(key.startsWith(userFilePrefix(USER_ID))).toBe(true);
  });

  describe('deleteUserFiles', () => {
    it('lists the user prefix and deletes everything under it', async () => {
      mockSend.mockResolvedValueOnce({
        Contents: [{ Key: 'users/user-1/avatar/a.jpg' }, { Key: 'users/user-1/food/b.png' }],
        IsTruncated: false,
      });
      mockSend.mockResolvedValueOnce({});

      const deleted = await deleteUserFiles(USER_ID);

      expect(deleted).toBe(2);
      expect(inputsFor('ListObjectsV2Command')[0]).toMatchObject({
        Bucket: 'trackvibe-test',
        Prefix: 'users/user-1/',
      });
      expect(inputsFor('DeleteObjectsCommand')[0].Delete).toMatchObject({
        Objects: [{ Key: 'users/user-1/avatar/a.jpg' }, { Key: 'users/user-1/food/b.png' }],
      });
    });

    // ListObjectsV2 caps a page at 1000 keys. A user with more than that would keep the
    // overflow forever if only the first page were swept.
    it('follows the continuation token instead of stopping at the first page', async () => {
      mockSend.mockResolvedValueOnce({
        Contents: [{ Key: 'users/user-1/food/1.jpg' }],
        IsTruncated: true,
        NextContinuationToken: 'page-2',
      });
      mockSend.mockResolvedValueOnce({});
      mockSend.mockResolvedValueOnce({
        Contents: [{ Key: 'users/user-1/food/2.jpg' }],
        IsTruncated: false,
      });
      mockSend.mockResolvedValueOnce({});

      const deleted = await deleteUserFiles(USER_ID);

      expect(deleted).toBe(2);
      expect(inputsFor('ListObjectsV2Command')[1]).toMatchObject({ ContinuationToken: 'page-2' });
    });

    it('issues no delete when the user never uploaded anything', async () => {
      mockSend.mockResolvedValueOnce({ Contents: [], IsTruncated: false });

      await expect(deleteUserFiles(USER_ID)).resolves.toBe(0);
      expect(sentCommands()).toEqual(['ListObjectsV2Command']);
    });

    // S3 reports per-object failures inside a 200 response. Swallowing them would report a
    // clean sweep while a deleted user's photos stayed in the bucket.
    it('raises when S3 reports per-object failures in an otherwise successful response', async () => {
      mockSend.mockResolvedValueOnce({
        Contents: [{ Key: 'users/user-1/avatar/a.jpg' }],
        IsTruncated: false,
      });
      mockSend.mockResolvedValueOnce({
        Errors: [{ Key: 'users/user-1/avatar/a.jpg', Code: 'AccessDenied', Message: 'denied' }],
      });

      await expect(deleteUserFiles(USER_ID)).rejects.toThrow(/AccessDenied/);
    });

    it('does nothing at all when no bucket is configured', async () => {
      config.awsS3Bucket = undefined;

      await expect(deleteUserFiles(USER_ID)).resolves.toBe(0);
      expect(mockSend).not.toHaveBeenCalled();
    });
  });
});
