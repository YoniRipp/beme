/**
 * Push notification controller — subscribe/unsubscribe endpoints.
 */
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getEffectiveUserId } from '../middleware/auth.js';
import * as pushSubscriptionModel from '../models/pushSubscription.js';
import { sendJson, sendNoContent, sendError } from '../utils/response.js';
import { isWebPushConfigured, VAPID_PUBLIC_KEY } from '../config/vapid.js';

export const getVapidPublicKey = asyncHandler(async (_req: Request, res: Response) => {
  if (!isWebPushConfigured) {
    sendError(res, 404, 'Push notifications not configured');
    return;
  }
  sendJson(res, { publicKey: VAPID_PUBLIC_KEY });
});

export const subscribe = asyncHandler(async (req: Request, res: Response) => {
  if (!isWebPushConfigured) {
    sendError(res, 404, 'Push notifications not configured');
    return;
  }

  const userId = getEffectiveUserId(req);
  const { endpoint, keys } = req.body as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    sendError(res, 400, 'Missing endpoint or keys (p256dh, auth)');
    return;
  }

  const sub = await pushSubscriptionModel.upsert(userId, endpoint, keys.p256dh, keys.auth);
  sendJson(res, { id: sub.id });
});

export const unsubscribe = asyncHandler(async (req: Request, res: Response) => {
  const userId = getEffectiveUserId(req);
  const { endpoint } = req.body as { endpoint?: string };

  if (!endpoint) {
    sendError(res, 400, 'Missing endpoint');
    return;
  }

  await pushSubscriptionModel.removeByEndpoint(userId, endpoint);
  sendNoContent(res);
});
