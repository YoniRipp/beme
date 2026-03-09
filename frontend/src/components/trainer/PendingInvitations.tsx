import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus } from 'lucide-react';
import { usePendingTrainerInvitations, useAcceptInvitation, useMyTrainer } from '@/hooks/useTrainer';
import { toast } from 'sonner';

export function PendingInvitations() {
  const { data: invitations = [], isLoading: loadingInvitations } = usePendingTrainerInvitations();
  const { data: trainerData, isLoading: loadingTrainer } = useMyTrainer();
  const acceptMutation = useAcceptInvitation();
  const [manualCode, setManualCode] = useState('');

  const handleAccept = (code: string) => {
    acceptMutation.mutate(code, {
      onSuccess: () => {
        toast.success('Invitation accepted');
        setManualCode('');
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to accept invitation');
      },
    });
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleAccept(manualCode.trim());
  };

  if (loadingInvitations || loadingTrainer) return null;

  const trainer = trainerData?.trainer;
  const hasPending = invitations.length > 0;

  if (!trainer && !hasPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Trainer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone mb-3">
            Have an invite code from a trainer? Enter it below to connect.
          </p>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <Input
              placeholder="Enter invite code"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={acceptMutation.isPending || !manualCode.trim()}>
              {acceptMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Accept'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Trainer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {trainer && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-sm font-medium text-charcoal">
              Your trainer: {trainer.name}
            </p>
            <p className="text-xs text-stone">{trainer.email}</p>
          </div>
        )}

        {hasPending && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-stone font-semibold">
              Pending Invitations
            </p>
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border"
              >
                <div>
                  <p className="text-sm font-medium text-charcoal">
                    From: {inv.trainerName || 'A trainer'}
                  </p>
                  <Badge variant="secondary" className="mt-1">pending</Badge>
                </div>
                {inv.inviteCode && (
                  <Button
                    size="sm"
                    onClick={() => handleAccept(inv.inviteCode!)}
                    disabled={acceptMutation.isPending}
                  >
                    {acceptMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Accept'
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {!trainer && (
          <>
            <p className="text-sm text-stone">
              Have an invite code from a trainer? Enter it below.
            </p>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input
                placeholder="Enter invite code"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={acceptMutation.isPending || !manualCode.trim()}>
                {acceptMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Accept'
                )}
              </Button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
