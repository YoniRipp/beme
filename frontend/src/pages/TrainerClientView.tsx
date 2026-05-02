import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PulseCard, PulsePage } from '@/components/pulse/PulseUI';
import { Button } from '@/components/ui/button';
import { ContentWithLoading } from '@/components/shared/ContentWithLoading';
import {
  ArrowLeft,
  Droplets,
  Dumbbell,
  Moon,
  Target,
  UtensilsCrossed,
} from 'lucide-react';
import {
  useTrainerClients,
  useTrainerClientWorkouts,
  useTrainerClientFoodEntries,
  useTrainerClientCheckIns,
  useTrainerClientGoals,
  useTrainerClientWater,
} from '@/hooks/useTrainer';
import { format, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useState } from 'react';

type Tab = 'food' | 'workouts' | 'water' | 'checkins' | 'goals';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'food',     label: 'Food',      icon: UtensilsCrossed },
  { id: 'workouts', label: 'Workouts',  icon: Dumbbell },
  { id: 'water',    label: 'Water',     icon: Droplets },
  { id: 'checkins', label: 'Check-ins', icon: Moon },
  { id: 'goals',    label: 'Goals',     icon: Target },
];

export default function TrainerClientView() {
  const { clientId = '' } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('food');

  const { data: clients = [] } = useTrainerClients();
  const client = clients.find((c) => c.clientId === clientId);

  const { data: workoutsData, isLoading: loadingWorkouts } = useTrainerClientWorkouts(clientId);
  const { data: foodData,     isLoading: loadingFood }     = useTrainerClientFoodEntries(clientId);
  const { data: checkInsData, isLoading: loadingCheckIns } = useTrainerClientCheckIns(clientId);
  const { data: goalsData,    isLoading: loadingGoals }    = useTrainerClientGoals(clientId);
  const { data: waterData,    isLoading: loadingWater }    = useTrainerClientWater(clientId);

  const workouts    = workoutsData?.data  ?? [];
  const foodEntries = foodData?.data      ?? [];
  const checkIns    = checkInsData?.data  ?? [];
  const goals       = goalsData?.data     ?? [];
  const waterEntries = waterData          ?? [];

  const isLoading = loadingWorkouts || loadingFood || loadingCheckIns || loadingGoals || loadingWater;

  // Summary stats
  const stats = useMemo(() => {
    const today = new Date();
    const todayFood = foodEntries.filter((f: Record<string, unknown>) =>
      isSameDay(new Date(f.date as string), today)
    );
    const avgCal = foodEntries.length > 0
      ? Math.round(
          foodEntries.reduce((s: number, f: Record<string, unknown>) => s + (Number(f.calories) || 0), 0) /
          new Set(foodEntries.map((f: Record<string, unknown>) => f.date)).size
        )
      : 0;
    const todayCal = todayFood.reduce((s: number, f: Record<string, unknown>) => s + (Number(f.calories) || 0), 0);
    const avgSleep = checkIns.length > 0
      ? (
          checkIns.reduce((s: number, c: Record<string, unknown>) => s + (Number(c.sleepHours) || 0), 0) /
          checkIns.length
        ).toFixed(1)
      : '—';
    const todayWater = waterEntries.find((w) => isSameDay(new Date(w.date), today));
    return { avgCal, todayCal, avgSleep, waterToday: todayWater?.glasses ?? 0 };
  }, [foodEntries, checkIns, waterEntries]);

  const joinedDate = client?.createdAt
    ? format(new Date(client.createdAt), 'MMM d, yyyy')
    : null;

  return (
    <PulsePage>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/trainer')}
          className="-ml-2 gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Client card */}
      <PulseCard className="mb-5 flex items-center gap-4 p-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-extrabold text-primary">
          {(client?.clientName ?? '?').trim().charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-extrabold tracking-tight">{client?.clientName ?? 'Client'}</p>
          <p className="text-sm text-muted-foreground truncate">{client?.clientEmail}</p>
          {joinedDate && (
            <p className="text-xs text-muted-foreground mt-0.5">Client since {joinedDate}</p>
          )}
        </div>
      </PulseCard>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-2.5 mb-5">
        <StatChip label="Workouts" value={workouts.length} />
        <StatChip label="Avg cal" value={stats.avgCal > 0 ? stats.avgCal.toLocaleString() : '—'} />
        <StatChip label="Avg sleep" value={`${stats.avgSleep}h`} />
        <StatChip label="Water today" value={`${stats.waterToday}gl`} />
      </div>

      <ContentWithLoading loading={isLoading} loadingText="Loading client data...">
        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto pb-1 mb-4 scrollbar-none">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const count = tabCount(tab.id, workouts, foodEntries, checkIns, goals, waterEntries);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors press',
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                {count > 0 && (
                  <span className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                    activeTab === tab.id ? 'bg-primary-foreground/20' : 'bg-muted-foreground/20'
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'food' && (
          <EntryList
            items={foodEntries}
            emptyMessage="No food entries yet."
            renderItem={(item) => (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{String(item.name || 'Food')}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(item.date as string)}
                    {item.mealType ? ` · ${item.mealType}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">{item.calories != null ? `${item.calories} cal` : ''}</p>
                  {(item.protein != null || item.carbs != null || item.fats != null) && (
                    <p className="text-[11px] text-muted-foreground">
                      P{Number(item.protein) || 0}·C{Number(item.carbs) || 0}·F{Number(item.fats) || 0}g
                    </p>
                  )}
                </div>
              </div>
            )}
          />
        )}

        {activeTab === 'workouts' && (
          <EntryList
            items={workouts}
            emptyMessage="No workouts yet."
            renderItem={(item) => (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{String(item.title || 'Workout')}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(item.date as string)}
                    {item.type ? ` · ${item.type}` : ''}
                    {item.durationMinutes ? ` · ${item.durationMinutes} min` : ''}
                  </p>
                </div>
                {Array.isArray(item.exercises) && (
                  <p className="text-sm text-muted-foreground shrink-0">
                    {item.exercises.length} exercise{item.exercises.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}
          />
        )}

        {activeTab === 'water' && (
          waterEntries.length === 0 ? (
            <PulseCard className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No water entries yet.</p>
            </PulseCard>
          ) : (
            <PulseCard className="overflow-hidden p-0">
              <div className="divide-y divide-border">
                {waterEntries.map((entry, i) => (
                  <div key={entry.id ?? i} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <p className="font-medium">{formatDate(entry.date)}</p>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-info">{entry.glasses} glasses</p>
                      {entry.mlTotal > 0 && (
                        <p className="text-xs text-muted-foreground">{entry.mlTotal} ml</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </PulseCard>
          )
        )}

        {activeTab === 'checkins' && (
          <EntryList
            items={checkIns}
            emptyMessage="No check-ins yet."
            renderItem={(item) => (
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{formatDate(item.date as string)}</p>
                <div className="text-right text-xs text-muted-foreground space-y-0.5">
                  {item.sleepHours != null && <p>Sleep {String(item.sleepHours)}h</p>}
                  {item.energyLevel != null && <p>Energy {Number(item.energyLevel)}/5</p>}
                  {item.mood != null && <p>Mood: {String(item.mood)}</p>}
                </div>
              </div>
            )}
          />
        )}

        {activeTab === 'goals' && (
          <EntryList
            items={goals}
            emptyMessage="No goals set yet."
            renderItem={(item) => (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium capitalize">{String(item.type || 'Goal')}</p>
                  <p className="text-xs text-muted-foreground capitalize">{String(item.period || '')}</p>
                </div>
                <p className="text-sm font-semibold shrink-0">{String(item.target ?? '')}</p>
              </div>
            )}
          />
        )}
      </ContentWithLoading>
    </PulsePage>
  );
}

// ─── Helpers ───────────────────────────────────────────────

function tabCount(
  tab: Tab,
  workouts: unknown[],
  food: unknown[],
  checkIns: unknown[],
  goals: unknown[],
  water: unknown[]
) {
  switch (tab) {
    case 'food': return food.length;
    case 'workouts': return workouts.length;
    case 'checkins': return checkIns.length;
    case 'goals': return goals.length;
    case 'water': return water.length;
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return isSameDay(d, new Date()) ? 'Today' : format(d, 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

interface EntryListProps {
  items: Record<string, unknown>[];
  emptyMessage: string;
  renderItem: (item: Record<string, unknown>) => React.ReactNode;
}

function EntryList({ items, emptyMessage, renderItem }: EntryListProps) {
  if (items.length === 0) {
    return (
      <PulseCard className="py-12 text-center">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </PulseCard>
    );
  }

  return (
    <PulseCard className="overflow-hidden p-0">
      <div className="divide-y divide-border">
        {items.map((item, i) => (
          <div key={String(item.id ?? i)} className="px-5 py-3.5">
            {renderItem(item)}
          </div>
        ))}
      </div>
    </PulseCard>
  );
}

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <PulseCard className="p-3 text-center">
      <p className="text-lg font-extrabold tabular-nums leading-none">{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground leading-none">{label}</p>
    </PulseCard>
  );
}
