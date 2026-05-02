import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useTrainerClients,
  useTrainerInvitations,
  useInviteByEmail,
  useGenerateInviteCode,
  useRemoveClient,
} from '@/hooks/useTrainer';
import { useApp } from '@/context/AppContext';
import { PulseCard, PulseHeader, PulsePage } from '@/components/pulse/PulseUI';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ContentWithLoading } from '@/components/shared/ContentWithLoading';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import {
  ChevronRight,
  Copy,
  Check,
  Link as LinkIcon,
  Loader2,
  Mail,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { TrainerClient } from '@/core/api/trainer';

export default function Trainer() {
  const navigate = useNavigate();
  const { user } = useApp();

  const { data: clients = [], isLoading: loadingClients } = useTrainerClients();
  const { data: invitations = [], isLoading: loadingInvitations } = useTrainerInvitations();
  const inviteByEmail = useInviteByEmail();
  const generateCode = useGenerateInviteCode();
  const removeClient = useRemoveClient();

  const [inviteTab, setInviteTab] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [generatedCode, setGeneratedCode] = useState<{ inviteCode: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<TrainerClient | null>(null);

  const activeClients = clients.filter((c) => c.status === 'active');
  const pendingInvitations = invitations.filter((i) => i.status === 'pending');

  const handleEmailInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    inviteByEmail.mutate(email.trim(), {
      onSuccess: () => {
        toast.success(`Invitation sent to ${email}`);
        setEmail('');
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to send invitation'),
    });
  };

  const handleGenerateCode = () => {
    generateCode.mutate(undefined, {
      onSuccess: (data) => {
        setGeneratedCode(data);
        toast.success('Invite code generated');
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to generate code'),
    });
  };

  const handleCopyCode = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode.inviteCode).then(() => {
      setCopied(true);
      toast.success('Code copied');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleConfirmRemove = () => {
    if (!removeTarget) return;
    removeClient.mutate(removeTarget.clientId, {
      onSuccess: () => toast.success(`${removeTarget.clientName} removed`),
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to remove client'),
    });
    setRemoveTarget(null);
  };

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  return (
    <PulsePage>
      <PulseHeader
        kicker="Trainer"
        title={`Hey ${firstName}`}
        subtitle={
          activeClients.length === 0
            ? 'Invite your first client to get started'
            : `${activeClients.length} active client${activeClients.length !== 1 ? 's' : ''}`
        }
      />

      <ContentWithLoading loading={loadingClients || loadingInvitations} loadingText="Loading clients...">
        <div className="space-y-5">

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            <PulseCard className="p-4 text-center">
              <p className="text-3xl font-extrabold tabular-nums">{activeClients.length}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Active</p>
            </PulseCard>
            <PulseCard className="p-4 text-center">
              <p className="text-3xl font-extrabold tabular-nums">{pendingInvitations.length}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pending</p>
            </PulseCard>
          </div>

          {/* Client list */}
          {clients.length === 0 ? (
            <PulseCard className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Users className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold">No clients yet</p>
                <p className="mt-0.5 text-sm text-muted-foreground">Use the invite form below to add your first client.</p>
              </div>
            </PulseCard>
          ) : (
            <PulseCard className="overflow-hidden p-0">
              <div className="px-5 py-4 border-b border-border">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Clients</p>
              </div>
              <div className="divide-y divide-border">
                {clients.map((client) => (
                  <div key={client.id} className="flex items-center gap-3 px-5 py-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {client.clientName.trim().charAt(0).toUpperCase()}
                    </div>
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => client.status === 'active' && navigate(`/trainer/client/${client.clientId}`)}
                    >
                      <p className="font-semibold truncate">{client.clientName}</p>
                      <p className="text-xs text-muted-foreground truncate">{client.clientEmail}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={client.status === 'active' ? 'default' : 'secondary'}
                        className="capitalize"
                      >
                        {client.status}
                      </Badge>
                      {client.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => navigate(`/trainer/client/${client.clientId}`)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors press"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setRemoveTarget(client)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors press"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </PulseCard>
          )}

          {/* Invite section */}
          <PulseCard className="overflow-hidden p-0">
            <div className="px-5 py-4 border-b border-border">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Invite a client</p>
            </div>

            {/* Tab switcher */}
            <div className="flex border-b border-border">
              {(['email', 'code'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setInviteTab(tab)}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
                    inviteTab === tab
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab === 'email' ? <Mail className="h-3.5 w-3.5" /> : <LinkIcon className="h-3.5 w-3.5" />}
                  {tab === 'email' ? 'By email' : 'Invite code'}
                </button>
              ))}
            </div>

            <div className="p-5">
              {inviteTab === 'email' ? (
                <form onSubmit={handleEmailInvite} className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="client@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="flex-1"
                  />
                  <Button type="submit" disabled={inviteByEmail.isPending || !email.trim()}>
                    {inviteByEmail.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
                  </Button>
                </form>
              ) : (
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={handleGenerateCode}
                    disabled={generateCode.isPending}
                  >
                    {generateCode.isPending
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Plus className="h-4 w-4" />}
                    Generate code
                  </Button>
                  {generatedCode && (
                    <div className="flex items-center gap-2 rounded-xl bg-muted p-3">
                      <code className="flex-1 select-all font-mono text-sm">{generatedCode.inviteCode}</code>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-background transition-colors press"
                      >
                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  )}
                  {generatedCode && (
                    <p className="text-xs text-muted-foreground text-center">
                      Expires {format(new Date(generatedCode.expiresAt), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Pending invitations */}
            {pendingInvitations.length > 0 && (
              <div className="border-t border-border px-5 py-4 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-3">
                  Pending ({pendingInvitations.length})
                </p>
                {pendingInvitations.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                    <p className="text-sm truncate text-muted-foreground">
                      {inv.email || `Code: ${inv.inviteCode?.slice(0, 10)}…`}
                    </p>
                    <Badge variant="secondary" className="shrink-0 ml-2">pending</Badge>
                  </div>
                ))}
              </div>
            )}
          </PulseCard>

        </div>
      </ContentWithLoading>

      <ConfirmationDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Remove client"
        message={`Remove ${removeTarget?.clientName ?? 'this client'}? They'll lose access to your trainer view.`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleConfirmRemove}
      />
    </PulsePage>
  );
}
