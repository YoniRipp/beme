import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useGroups } from '@/hooks/useGroups';
import { GroupSettingsModal } from '@/components/groups/GroupSettingsModal';
import { MemberList } from '@/components/groups/MemberList';
import { Button } from '@/components/ui/button';
import { Settings, ArrowLeft } from 'lucide-react';

export function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useApp();
  const { getGroupById, groupsLoading } = useGroups();

  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const group = id ? getGroupById(id) : undefined;

  if (!id) {
    navigate('/groups', { replace: true });
    return null;
  }

  if (groupsLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate('/groups')} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to groups
        </Button>
        <p className="text-muted-foreground">Loading group...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate('/groups')} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to groups
        </Button>
        <p className="text-muted-foreground">Group not found.</p>
      </div>
    );
  }

  const isAdmin = group.members.some((m) => m.userId === user?.id && m.role === 'admin');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" onClick={() => navigate('/groups')} className="gap-2 shrink-0">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        {isAdmin && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSettingsModalOpen(true)}
            aria-label="Group settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Members</h3>
        <MemberList members={group.members} />
      </div>

      <GroupSettingsModal
        open={settingsModalOpen}
        onOpenChange={setSettingsModalOpen}
        group={group}
      />
    </div>
  );
}
