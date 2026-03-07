import { CreditCard, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';

export function SubscriptionSection() {
  const { isPro, subscriptionStatus, manage } = useSubscription();
  const navigate = useNavigate();

  const statusLabels: Record<string, string> = {
    free: 'Free',
    pro: 'Pro',
    trainer: 'Trainer',
    trainer_pro: 'Trainer Pro',
    past_due: 'Pro (payment issue)',
    canceled: 'Canceled',
    paused: 'Paused',
    expired: 'Expired',
  };
  const statusLabel = statusLabels[subscriptionStatus] || 'Free';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-stone" />
          <CardTitle className="text-base">Subscription</CardTitle>
        </div>
        <CardDescription>Manage your BeMe subscription</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Current Plan</p>
            <p className="text-sm text-muted-foreground">{statusLabel}</p>
          </div>
          {isPro ? (
            <Button variant="outline" size="sm" onClick={manage}>
              Manage Subscription
              <ExternalLink className="ml-1 h-3 w-3" />
            </Button>
          ) : (
            <Button size="sm" onClick={() => navigate('/pricing')}>
              Upgrade to Pro
            </Button>
          )}
        </div>
        {!isPro && (
          <p className="text-xs text-muted-foreground">
            Pro includes voice input, AI insights, and AI food lookup. Plans start at $7.99/month.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
