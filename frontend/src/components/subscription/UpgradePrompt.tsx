import { Clock, Lock, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';

interface UpgradePromptProps {
  feature: string;
  description?: string;
  compact?: boolean;
  quotaExhausted?: boolean;
}

export function UpgradePrompt({ feature, description, compact, quotaExhausted }: UpgradePromptProps) {
  const { subscribe } = useSubscription();

  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950">
        <Lock className="h-4 w-4 shrink-0 text-amber-600" />
        <span className="text-amber-800 dark:text-amber-200">
          <strong>{feature}</strong> requires Pro.
        </span>
        <Button
          size="sm"
          variant="outline"
          className="ml-auto shrink-0"
          onClick={subscribe}
        >
          Upgrade
        </Button>
      </div>
    );
  }

  if (quotaExhausted) {
    return (
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:border-blue-800 dark:from-blue-950 dark:to-indigo-950">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <Clock className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-lg">{feature}</CardTitle>
          <CardDescription>
            {description || "You've used all your free AI calls this month. Exciting updates coming soon!"}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button variant="outline" onClick={subscribe} className="px-8">
            Upgrade to Pro for unlimited access
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:border-amber-800 dark:from-amber-950 dark:to-orange-950">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
          <Sparkles className="h-6 w-6 text-amber-600" />
        </div>
        <CardTitle className="text-lg">Unlock {feature}</CardTitle>
        <CardDescription>
          {description || `${feature} is a Pro feature. Upgrade to get access to AI-powered tools that make tracking your life effortless.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button onClick={subscribe} className="px-8">
          Upgrade to Pro — $7.99/mo
        </Button>
      </CardContent>
    </Card>
  );
}
