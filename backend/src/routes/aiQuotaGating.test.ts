/**
 * AI quota gating policy, tested at the route layer.
 *
 * The defect this guards against was not a bug in any one handler — it was that
 * `requirePro` debited a call and nothing at the call site said so, so three routes
 * that never touch a model drained a free user's monthly allowance.
 *
 * Two independent assertions here, both deliberately hard to satisfy by accident:
 *
 *  1. Per route, drive a real request through the real router against an in-memory
 *     quota ledger and assert the balance before and after.
 *  2. Walk the router stacks and assert every AI-gated route is declared in POLICY,
 *     with the middleware it is actually mounted with. Adding a route behind either
 *     guard fails this test until someone states whether it pays.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';

// ─── Quota ledger ──────────────────────────────────────────────────────────────
// A stand-in for services/aiQuota.js with the same semantics as the free tier:
// 10 calls a month, tryConsumeAiCall debits, checkAiQuota does not.

const FREE_TIER_LIMIT = 10;
const ledger = { used: 0 };

const consumeSpy = vi.fn();
const checkSpy = vi.fn();

function remaining() {
  return Math.max(0, FREE_TIER_LIMIT - ledger.used);
}

vi.mock('../services/aiQuota.js', () => ({
  FREE_TIER_LIMIT: 10,
  tryConsumeAiCall: async (userId: string) => {
    consumeSpy(userId);
    if (ledger.used >= FREE_TIER_LIMIT) return { allowed: false, remaining: 0, isPro: false };
    ledger.used += 1;
    return { allowed: true, remaining: FREE_TIER_LIMIT - ledger.used, isPro: false };
  },
  checkAiQuota: async (userId: string) => {
    checkSpy(userId);
    return { allowed: remaining() > 0, remaining: remaining(), isPro: false };
  },
  getAiCallsRemaining: async () => remaining(),
}));

// ─── Everything that is not the gating decision ────────────────────────────────

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-1', email: 'user@test.com', role: 'user' };
    next();
  },
  resolveEffectiveUserId: (_req: any, _res: any, next: any) => next(),
  getEffectiveUserId: (req: any) => req.user.id,
}));

vi.mock('../middleware/validateBody.js', () => ({
  validateBody: () => (_req: any, _res: any, next: any) => next(),
}));

/** Controllers are stubbed: what is under test is which guard runs before them. */
function stub(name: string) {
  return (_req: any, res: any) => res.status(200).json({ handler: name });
}

vi.mock('../controllers/chat.js', () => ({
  chat: stub('chat'),
  agentChat: stub('agentChat'),
  agentChatStream: stub('agentChatStream'),
  confirmPlan: stub('confirmPlan'),
  getHistory: stub('getHistory'),
  deleteHistory: stub('deleteHistory'),
}));

vi.mock('../controllers/insights.js', () => ({
  getInsights: stub('getInsights'),
  refreshInsightsController: stub('refreshInsightsController'),
  getStats: stub('getStats'),
  getTodayRecommendations: stub('getTodayRecommendations'),
  getFreshness: stub('getFreshness'),
}));

vi.mock('../controllers/voice.js', () => ({
  understand: stub('understand'),
  transcribe: stub('transcribe'),
}));

vi.mock('../controllers/foodSearch.js', () => ({
  search: stub('search'),
  lookupOrCreate: stub('lookupOrCreate'),
}));

vi.mock('../controllers/barcode.js', () => ({
  lookupBarcode: stub('lookupBarcode'),
}));

import chatRouter from './chat.js';
import insightsRouter from './insights.js';
import voiceRouter from './voice.js';
import foodSearchRouter from './foodSearch.js';

const ROUTERS = {
  chat: chatRouter,
  insights: insightsRouter,
  voice: voiceRouter,
  foodSearch: foodSearchRouter,
};

// ─── The policy ────────────────────────────────────────────────────────────────
// `cost` is what a successful request must debit. Keep the comment honest — it is
// the reason a reviewer can tell whether the number is right.

type Guard = 'requireAiQuota' | 'requireAiAccess';

interface PolicyEntry {
  method: 'get' | 'post' | 'delete';
  path: string;
  guard: Guard;
  cost: 0 | 1;
  why: string;
}

const POLICY: PolicyEntry[] = [
  // Reads and deletes. No model, no charge — this is the defect being fixed.
  { method: 'get', path: '/api/chat/history', guard: 'requireAiAccess', cost: 0, why: 'selects chat_messages rows' },
  { method: 'delete', path: '/api/chat/history', guard: 'requireAiAccess', cost: 0, why: 'deletes chat_messages rows' },
  { method: 'get', path: '/api/insights/freshness', guard: 'requireAiAccess', cost: 0, why: 'two SELECTs and a timestamp comparison' },

  // Reaches a model. Charges exactly once.
  { method: 'post', path: '/api/chat', guard: 'requireAiQuota', cost: 1, why: 'Gemini chat completion' },
  { method: 'post', path: '/api/chat/agent', guard: 'requireAiQuota', cost: 1, why: 'Gemini agent turn' },
  { method: 'post', path: '/api/chat/agent/stream', guard: 'requireAiQuota', cost: 1, why: 'Gemini agent turn, streamed' },
  { method: 'post', path: '/api/chat/agent/confirm-plan', guard: 'requireAiQuota', cost: 1, why: 'executes a model-authored plan' },
  { method: 'post', path: '/api/insights/refresh', guard: 'requireAiQuota', cost: 1, why: 'force-regenerates insights' },
  { method: 'get', path: '/api/insights/today', guard: 'requireAiQuota', cost: 1, why: 'generates today recommendations' },
  { method: 'post', path: '/api/food/lookup-or-create', guard: 'requireAiQuota', cost: 1, why: 'Gemini food lookup' },
  { method: 'post', path: '/api/voice/understand', guard: 'requireAiQuota', cost: 1, why: 'Gemini intent parse' },
  { method: 'post', path: '/api/voice/transcribe', guard: 'requireAiQuota', cost: 1, why: 'Gemini transcription' },

  // Deliberately still charging on entry. See the header comment in routes/insights.ts:
  // it serves cache most of the time, but moving the debit into the service would
  // double-charge /today and /refresh and start billing refreshAllPeriods' three
  // background generations, and requireAiAccess would let a cache miss hit Gemini free.
  { method: 'get', path: '/api/insights', guard: 'requireAiQuota', cost: 1, why: 'cached read, generates on miss — charged on entry by decision' },
];

/** AI-gated routes are the only ones in POLICY; everything else must stay ungated. */
const UNGATED = [
  { method: 'get' as const, path: '/api/insights/stats' },
  { method: 'get' as const, path: '/api/food/search' },
];

function createApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(chatRouter);
  app.use(insightsRouter);
  app.use(voiceRouter);
  app.use(foodSearchRouter);
  return app;
}

/** Names of the guards in a mounted route's handler chain. */
function guardsFor(method: string, path: string): string[] {
  for (const router of Object.values(ROUTERS)) {
    for (const layer of (router as any).stack) {
      const route = layer.route;
      if (!route || route.path !== path || !route.methods[method]) continue;
      return route.stack
        .map((l: any) => l.name)
        .filter((n: string) => n === 'requireAiAccess' || n === 'requireAiQuota');
    }
  }
  return [];
}

/** Every route mounted across the four AI routers, as `method path`. */
function allMountedRoutes(): Array<{ method: string; path: string }> {
  const out: Array<{ method: string; path: string }> = [];
  for (const router of Object.values(ROUTERS)) {
    for (const layer of (router as any).stack) {
      const route = layer.route;
      if (!route) continue;
      for (const method of Object.keys(route.methods)) {
        if (route.methods[method]) out.push({ method, path: route.path });
      }
    }
  }
  return out;
}

describe('AI quota gating', () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    ledger.used = 0;
    app = createApp();
  });

  describe('balance before and after', () => {
    for (const entry of POLICY) {
      const label = `${entry.method.toUpperCase()} ${entry.path}`;

      it(`${label} costs ${entry.cost} (${entry.why})`, async () => {
        expect(remaining()).toBe(10);

        await (request(app) as any)[entry.method](entry.path).send({}).expect(200);

        expect(remaining()).toBe(10 - entry.cost);
        expect(consumeSpy).toHaveBeenCalledTimes(entry.cost);
      });
    }

    it('the three read-only routes are free even when called repeatedly', async () => {
      for (let i = 0; i < 25; i++) {
        await request(app).get('/api/chat/history').expect(200);
        await request(app).delete('/api/chat/history').expect(200);
        await request(app).get('/api/insights/freshness').expect(200);
      }

      expect(remaining()).toBe(10);
      expect(consumeSpy).not.toHaveBeenCalled();
    });

    it('a free user who spent their allowance can still read and delete their chat history', async () => {
      ledger.used = FREE_TIER_LIMIT;

      await request(app).get('/api/chat/history').expect(403);
      await request(app).delete('/api/chat/history').expect(403);

      expect(consumeSpy).not.toHaveBeenCalled();
    });

    it('a model-backed route debits exactly once per request, never twice', async () => {
      await request(app).post('/api/chat').send({ message: 'hi' }).expect(200);
      await request(app).post('/api/chat').send({ message: 'hi' }).expect(200);
      await request(app).post('/api/chat').send({ message: 'hi' }).expect(200);

      expect(remaining()).toBe(7);
      expect(consumeSpy).toHaveBeenCalledTimes(3);
    });

    it('an exhausted free user is refused with the frozen payload and is not debited past zero', async () => {
      ledger.used = FREE_TIER_LIMIT;

      const res = await request(app).post('/api/chat').send({ message: 'hi' }).expect(403);

      expect(res.body).toEqual({
        error: 'free_quota_exhausted',
        message: "You've used all your free AI calls this month. Exciting updates coming soon!",
        remainingCalls: 0,
      });
      expect(ledger.used).toBe(FREE_TIER_LIMIT);
    });

    it('opening the Insights page no longer burns the allowance on freshness polling', async () => {
      // The measured regression: freshness polls plus a history read used to cost 1 each.
      for (let i = 0; i < 6; i++) await request(app).get('/api/insights/freshness').expect(200);
      await request(app).get('/api/chat/history').expect(200);

      expect(remaining()).toBe(10);
    });

    for (const route of UNGATED) {
      it(`${route.method.toUpperCase()} ${route.path} is not gated at all`, async () => {
        await (request(app) as any)[route.method](route.path).expect(200);

        expect(remaining()).toBe(10);
        expect(consumeSpy).not.toHaveBeenCalled();
        expect(checkSpy).not.toHaveBeenCalled();
      });
    }
  });

  describe('mounted middleware matches the policy', () => {
    for (const entry of POLICY) {
      it(`${entry.method.toUpperCase()} ${entry.path} is mounted with ${entry.guard}`, () => {
        expect(guardsFor(entry.method, entry.path)).toEqual([entry.guard]);
      });
    }

    it('a route mounted behind either guard must be declared in POLICY', () => {
      const declared = new Set(POLICY.map(e => `${e.method} ${e.path}`));
      const undeclared = allMountedRoutes()
        .filter(r => guardsFor(r.method, r.path).length > 0)
        .map(r => `${r.method} ${r.path}`)
        .filter(key => !declared.has(key));

      expect(undeclared).toEqual([]);
    });

    it('every POLICY entry corresponds to a route that actually exists', () => {
      const mounted = new Set(allMountedRoutes().map(r => `${r.method} ${r.path}`));
      const missing = POLICY.map(e => `${e.method} ${e.path}`).filter(key => !mounted.has(key));

      expect(missing).toEqual([]);
    });

    it('a cost-0 route is on requireAiAccess and a cost-1 route is on requireAiQuota', () => {
      const mismatched = POLICY.filter(
        e =>
          (e.cost === 0 && e.guard !== 'requireAiAccess') ||
          (e.cost === 1 && e.guard !== 'requireAiQuota'),
      ).map(e => `${e.method} ${e.path}`);

      expect(mismatched).toEqual([]);
    });
  });
});
