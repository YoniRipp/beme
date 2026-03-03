import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroups } from '@/hooks/useGroups';
import { useApp } from '@/context/AppContext';
import { Group, GroupInvitation } from '@/types/group';
import { EmptyState } from '@/components/shared/EmptyState';
import { GroupCard } from '@/components/groups/GroupCard';
import { GroupInvitations } from '@/components/groups/GroupInvitations';
import { CreateGroupModal } from '@/components/groups/CreateGroupModal';
import { GroupSettingsModal } from '@/components/groups/GroupSettingsModal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ContentWithLoading } from '@/components/shared/ContentWithLoading';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Plus } from 'lucide-react';

export function Groups() {
  const { user } = useApp();
  const { groups, groupsLoading, groupsError, addGroup, acceptInvite, cancelInvite } = useGroups();
  const navigate = useNavigate();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | undefined>(undefined);

  const myInvitations = useMemo(() => {
    const email = user?.email?.toLowerCase();
    if (!email) return [];
    return groups.flatMap((g) =>
      g.invitations
        .filter((inv) => inv.email.toLowerCase() === email)
        .map((invitation) => ({ group: g, invitation }))
    );
  }, [groups, user?.email]);

  const handleSettings = (group: Group) => {
    setSelectedGroup(group);
    setSettingsModalOpen(true);
  };

  const handleAcceptInvitation = async (group: Group) => {
    await acceptInvite(group.id);
    navigate(`/groups/${group.id}`);
  };

  const handleDeclineInvitation = (group: Group, invitation: GroupInvitation) => {
    cancelInvite(group.id, invitation.email);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {myInvitations.length > 0 && (
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">Invitations for you</h2>
          <GroupInvitations
            hideTitle
            items={myInvitations.map(({ group, invitation }) => ({ groupName: group.name, invitation }))}
            onAccept={(invitation) => {
              const item = myInvitations.find((x) => x.invitation === invitation);
              if (item) handleAcceptInvitation(item.group);
            }}
            onDecline={(invitation) => {
              const item = myInvitations.find((x) => x.invitation === invitation);
              if (item) handleDeclineInvitation(item.group, item.invitation);
            }}
          />
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />
          New Group
        </Button>
      </div>

      <ContentWithLoading
        loading={groupsLoading}
        loadingText="Loading groups..."
        error={groupsError}
        skeleton={
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            ))}
          </div>
        }
      >
        {groups.length === 0 ? (
          <EmptyState
            icon={Users}
            title="You don't have any groups yet"
            description="Create your first group to collaborate with others"
            action={{
              label: "Create your first group",
              onClick: () => setCreateModalOpen(true),
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                onSettings={group.members.some((m) => m.userId === user?.id && m.role === 'admin') ? handleSettings : undefined}
              />
            ))}
          </div>
        )}
      </ContentWithLoading>

      <CreateGroupModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSave={addGroup}
      />

      <GroupSettingsModal
        open={settingsModalOpen}
        onOpenChange={setSettingsModalOpen}
        group={selectedGroup}
      />
    </div>
  );
}
