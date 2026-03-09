import { useState } from 'react';
import { useTrainerClients, useTrainerInvitations, useInviteByEmail, useGenerateInviteCode, useRemoveClient } from '@/hooks/useTrainer';
import { ClientList } from '@/components/trainer/ClientList';
import { InviteForm } from '@/components/trainer/InviteForm';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { toast } from 'sonner';

export default function Trainer() {
  const { data: clients = [], isLoading: loadingClients } = useTrainerClients();
  const { data: invitations = [], isLoading: loadingInvitations } = useTrainerInvitations();
  const inviteByEmail = useInviteByEmail();
  const generateCode = useGenerateInviteCode();
  const removeClient = useRemoveClient();
  const [generatedCode, setGeneratedCode] = useState<{ inviteCode: string; expiresAt: string } | null>(null);

  const handleInviteByEmail = (email: string) => {
    inviteByEmail.mutate(email, {
      onSuccess: () => {
        toast.success(`Invitation sent to ${email}`);
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to send invitation');
      },
    });
  };

  const handleGenerateCode = () => {
    generateCode.mutate(undefined, {
      onSuccess: (data) => {
        setGeneratedCode(data);
        toast.success('Invite code generated');
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to generate code');
      },
    });
  };

  const handleRemoveClient = (clientId: string) => {
    removeClient.mutate(clientId, {
      onSuccess: () => {
        toast.success('Client removed');
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to remove client');
      },
    });
  };

  if (loadingClients || loadingInvitations) {
    return <LoadingSpinner text="Loading trainer dashboard..." />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Trainer Dashboard</h1>
        <p className="text-sm text-stone mt-1">
          Manage your clients and invitations
        </p>
      </div>

      <InviteForm
        onInviteByEmail={handleInviteByEmail}
        onGenerateCode={handleGenerateCode}
        invitingByEmail={inviteByEmail.isPending}
        generatingCode={generateCode.isPending}
        generatedCode={generatedCode}
        invitations={invitations}
      />

      <ClientList
        clients={clients}
        onRemove={handleRemoveClient}
        removing={removeClient.isPending}
      />
    </div>
  );
}
