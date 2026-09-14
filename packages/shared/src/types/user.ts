/**
 * Union of both clients' roles: the web client declared `'admin' | 'user'`, mobile
 * declared `'admin' | 'user' | 'trainer'`. The API does return `'trainer'`
 * (see `frontend/src/core/api/admin.ts`), so the wider union is the correct one.
 */
export type UserRole = 'admin' | 'user' | 'trainer';

export type SubscriptionStatus = 'free' | 'pro' | 'past_due' | 'canceled' | 'paused' | 'expired';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionPlan?: 'monthly' | 'yearly' | null;
  subscriptionCurrentPeriodEnd?: string;
  aiCallsRemaining?: number; // -1 = unlimited (pro), 0-10 for free tier
}
