/**
 * AI entitlement middleware. Must be used after requireAuth (req.user must be set).
 *
 * Two guards, because "may this user use AI?" and "charge this user for an AI call"
 * are different questions and the call site has to say which one it means:
 *
 * - `requireAiAccess` — checks entitlement, spends nothing. For endpoints that are
 *   gated behind AI but never reach a model (reading or deleting chat history,
 *   polling insight freshness).
 * - `requireAiQuota`  — checks entitlement and debits one call. For endpoints that
 *   do reach a model.
 *
 * Rules for both:
 * - Pro users: unlimited access.
 * - Free users: up to FREE_TIER_LIMIT (10) AI calls per calendar month.
 * - When Lemon Squeezy is not configured, all users are allowed (dev convenience).
 *
 * If you add a route behind either of these, add it to the classification table in
 * `routes/aiQuotaGating.test.ts` — that test fails until you have declared, in one
 * place, whether the new route pays.
 */
import { Request, Response, NextFunction } from 'express';
import { checkAiQuota, tryConsumeAiCall, type QuotaResult } from '../services/aiQuota.js';

/**
 * The exhausted-quota body. Byte-identical across both guards and frozen on purpose:
 * the web client and the MCP server both branch on `error === 'free_quota_exhausted'`.
 */
function quotaExhaustedBody() {
  return {
    error: 'free_quota_exhausted',
    message: "You've used all your free AI calls this month. Exciting updates coming soon!",
    remainingCalls: 0,
  };
}

function gate(resolve: (userId: string) => Promise<QuotaResult>) {
  return async function handle(req: Request, res: Response, next: NextFunction) {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const result = await resolve(req.user.id);

      if (result.allowed) {
        res.locals.remainingCalls = result.remaining;
        return next();
      }

      return res.status(403).json(quotaExhaustedBody());
    } catch (e) {
      next(e);
    }
  };
}

const accessGate = gate(checkAiQuota);
const quotaGate = gate(tryConsumeAiCall);

/**
 * Entitlement check only — spends nothing.
 * Use on AI-gated endpoints that never invoke a model.
 */
export async function requireAiAccess(req: Request, res: Response, next: NextFunction) {
  return accessGate(req, res, next);
}

/**
 * Entitlement check that debits one AI call up front.
 * Use only on endpoints that actually reach a model.
 */
export async function requireAiQuota(req: Request, res: Response, next: NextFunction) {
  return quotaGate(req, res, next);
}
