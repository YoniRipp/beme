import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useGroups } from '@/hooks/useGroups';
import { useSchedule } from '@/hooks/useSchedule';
import { useTransactions } from '@/hooks/useTransactions';
import { useSettings } from '@/hooks/useSettings';
import { ScheduleItem as ScheduleItemComponent } from '@/components/home/ScheduleItem';
import { ScheduleModal } from '@/components/home/ScheduleModal';
import { GroupSettingsModal } from '@/components/groups/GroupSettingsModal';
import { MemberList } from '@/components/groups/MemberList';
import { TransactionModal } from '@/features/money/components/TransactionModal';
import { TransactionCard } from '@/features/money/components/TransactionCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ContentWithLoading } from '@/components/shared/ContentWithLoading';
import { Plus, Settings, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { ScheduleItem as ScheduleItemType } from '@/types/schedule';
import { Transaction } from '@/types/transaction';

export function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useApp();
  const { getGroupById, groupsLoading } = useGroups();
  const { scheduleItems, scheduleLoading, scheduleError, addScheduleItem, updateScheduleItem, deleteScheduleItem } = useSchedule();
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { settings } = useSettings();

  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItemType | undefined>(undefined);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);

  const group = id ? getGroupById(id) : undefined;

  const groupEvents = useMemo(() => {
    if (!group) return [];
    return scheduleItems
      .filter((item) => item.groupId === group.id)
      .sort((a, b) => {
        const d = (a.date || '').localeCompare(b.date || '');
        if (d !== 0) return d;
        return (a.startTime || '00:00').localeCompare(b.startTime || '00:00');
      });
  }, [group, scheduleItems]);

  const groupExpenses = useMemo(() => {
    if (!group) return [];
    return transactions
      .filter((t) => t.groupId === group.id)
      .sort((a, b) => {
        const da = typeof a.date === 'string' ? a.date : new Date(a.date).toISOString().slice(0, 10);
        const db = typeof b.date === 'string' ? b.date : new Date(b.date).toISOString().slice(0, 10);
        return db.localeCompare(da);
      });
  }, [group, transactions]);

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

  const handleScheduleSave = async (item: Omit<ScheduleItemType, 'id'>) => {
    try {
      if (editingSchedule) {
        await updateScheduleItem(editingSchedule.id, item);
      } else {
        await addScheduleItem({ ...item, groupId: group.id, order: scheduleItems.length });
      }
      setEditingSchedule(undefined);
      setScheduleModalOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save schedule item. Please try again.');
    }
  };

  const handleTransactionSave = async (transaction: Omit<Transaction, 'id'>) => {
    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, { ...transaction, groupId: group.id });
      } else {
        await addTransaction({ ...transaction, groupId: group.id });
      }
      setEditingTransaction(undefined);
      setTransactionModalOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save transaction. Please try again.');
    }
  };

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

      <section>
        <h2 className="text-lg font-semibold mb-3">Events</h2>
        <ContentWithLoading loading={scheduleLoading} loadingText="Loading..." error={scheduleError}>
          {groupEvents.length === 0 ? (
            <Card
              className="p-6 border-2 border-dashed cursor-pointer hover:border-primary transition-colors text-center"
              onClick={() => {
                setEditingSchedule(undefined);
                setScheduleModalOpen(true);
              }}
            >
              <Plus className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
              <p className="font-medium mb-1">Add event</p>
              <p className="text-sm text-muted-foreground">Schedule something for this group</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {groupEvents.map((item) => (
                <ScheduleItemComponent
                  key={item.id}
                  item={item}
                  isPast={false}
                  onEdit={(i) => {
                    setEditingSchedule(i);
                    setScheduleModalOpen(true);
                  }}
                  onDelete={deleteScheduleItem}
                  categoryColors={settings.scheduleCategoryColors}
                />
              ))}
              <Card
                className="p-4 border-2 border-dashed cursor-pointer hover:border-primary transition-colors text-center bg-muted/50"
                onClick={() => {
                  setEditingSchedule(undefined);
                  setScheduleModalOpen(true);
                }}
              >
                <Plus className="w-6 h-6 mx-auto text-primary" />
                <p className="text-sm font-medium mt-1 text-muted-foreground">Add event</p>
              </Card>
            </div>
          )}
        </ContentWithLoading>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Expenses</h2>
        {groupExpenses.length === 0 ? (
          <Card
            className="p-6 border-2 border-dashed cursor-pointer hover:border-primary transition-colors text-center"
            onClick={() => {
              setEditingTransaction(undefined);
              setTransactionModalOpen(true);
            }}
          >
            <Plus className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
            <p className="font-medium mb-1">Add expense</p>
            <p className="text-sm text-muted-foreground">Track shared costs for this group</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {groupExpenses.map((transaction) => (
              <TransactionCard
                key={transaction.id}
                transaction={transaction}
                onEdit={(t) => {
                  setEditingTransaction(t);
                  setTransactionModalOpen(true);
                }}
                onDelete={deleteTransaction}
              />
            ))}
            <Card
              className="p-4 border-2 border-dashed cursor-pointer hover:border-primary transition-colors text-center bg-muted/50"
              onClick={() => {
                setEditingTransaction(undefined);
                setTransactionModalOpen(true);
              }}
            >
              <Plus className="w-6 h-6 mx-auto text-primary" />
              <p className="text-sm font-medium mt-1 text-muted-foreground">Add expense</p>
            </Card>
          </div>
        )}
      </section>

      <GroupSettingsModal
        open={settingsModalOpen}
        onOpenChange={setSettingsModalOpen}
        group={group}
      />

      <ScheduleModal
        open={scheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
        onSave={handleScheduleSave}
        item={editingSchedule}
        initialGroupId={editingSchedule ? undefined : group.id}
      />

      <TransactionModal
        open={transactionModalOpen}
        onOpenChange={setTransactionModalOpen}
        onSave={handleTransactionSave}
        transaction={editingTransaction}
        initialGroupId={editingTransaction ? undefined : group.id}
      />
    </div>
  );
}
