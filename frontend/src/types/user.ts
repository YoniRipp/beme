export type UserRole = 'admin' | 'user' | 'trainer';
export type SubscriptionStatus = 'free' | 'pro' | 'trainer' | 'trainer_pro' | 'past_due' | 'canceled' | 'paused' | 'expired';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionCurrentPeriodEnd?: string;
  aiCallsRemaining?: number; // -1 = unlimited (pro), 0-10 for free tier
}
