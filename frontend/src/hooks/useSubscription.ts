import { useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { subscriptionApi } from '@/core/api/subscription';
import { toast } from 'sonner';

export function useSubscription() {
  const { user } = useAuth();
  const isPro = user?.subscriptionStatus === 'pro';

  const subscribe = useCallback(async () => {
    try {
      const { url } = await subscriptionApi.createCheckout();
      if (!url) throw new Error('No checkout URL returned');
      window.location.href = url;
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Could not start checkout. Please try again.'
      );
    }
  }, []);

  const manage = useCallback(async () => {
    try {
      const { url } = await subscriptionApi.createPortal();
      if (!url) throw new Error('No portal URL returned');
      window.location.href = url;
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Could not open billing portal. Please try again.'
      );
    }
  }, []);

  return {
    isPro,
    subscriptionStatus: user?.subscriptionStatus || 'free',
    subscribe,
    manage,
  };
}
