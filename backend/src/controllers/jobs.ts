/**
 * Job status polling controller.
 */
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getRedisClient, isRedisConfigured } from '../redis/client.js';
import { sendJson, sendError } from '../utils/response.js';

export const getJobStatus = asyncHandler(async (req: Request, res: Response) => {
  if (!isRedisConfigured()) {
    return sendError(res, 503, 'Job polling not available (Redis not configured)');
  }

  const { jobId } = req.params;

  if (!jobId || typeof jobId !== 'string') {
    return sendError(res, 400, 'Invalid jobId');
  }

  const redis = await getRedisClient();
  if (!redis) {
    return sendError(res, 503, 'Redis not available');
  }
  const data = await redis.get(`job:${jobId}`);

  if (!data) {
    return sendError(res, 404, 'Job not found or expired');
  }

  try {
    sendJson(res, JSON.parse(data));
  } catch {
    return sendError(res, 500, 'Malformed job data');
  }
});
