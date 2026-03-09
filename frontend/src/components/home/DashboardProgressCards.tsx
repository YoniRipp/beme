import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Dumbbell, Flame, Moon, Plus } from 'lucide-react';
import { useGoals } from '@/hooks/useGoals';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useEnergy } from '@/hooks/useEnergy';
import { useMacroGoals } from '@/hooks/useMacroGoals';
import type { Goal } from '@/types/goals';
import { isWithinInterval } from 'date-fns';
import { getPeriodRange } from '@/lib/dateRanges';

/** Circular progress ring - radius chosen so circumference ≈ 100 for easy percentage math */
const R = 16;
const CIRCUMFERENCE = 2 * Math.PI * R;

type CardType = 'workouts' | 'calories' | 'sleep';

interface ProgressCardData {
  current: number;
  target: number;
  label: string;
  addLabel: string;
  cardType: CardType;
  formatValue: (v: number) => string;
  icon: React.ReactNode;
  ringColor: string;
  goal?: Goal;
}

function ProgressRing({ value, color }: { value: number; color: string }) {
  const percent = Math.min(100, Math.max(0, value));
  const offset = CIRCUMFERENCE * (1 - percent / 100);

  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 48 48"
      className="transform -rotate-90"
      aria-hidden
    >
      <circle
        cx="24"
        cy="24"
        r={R}
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        className="text-muted/30"
      />
      <circle
        cx="24"
        cy="24"
        r={R}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        className="transition-all duration-500 ease-out"
      />
    </svg>
  );
}

function ProgressCard({
  data,
  onAddGoal,
  onAdd,
}: {
  data: ProgressCardData;
  onAddGoal?: () => void;
  onAdd?: () => void;
}) {
  const hasGoal = data.target > 0;
  const percentage = hasGoal ? (data.current / data.target) * 100 : 0;

  // When goal exists, tapping the card triggers the add/log action
  // When no goal, tapping the card opens the goal creation modal
  const cardAction = hasGoal ? onAdd : onAddGoal;
  const isClickable = !!cardAction;

  return (
    <Card
      className={`flex flex-col items-center p-4 relative ${isClickable ? 'cursor-pointer hover:border-primary/50 transition-colors' : ''}`}
      onClick={cardAction}
      role={isClickable ? 'button' : undefined}
    >
      <CardContent className="flex flex-col items-center p-0 w-full">
        <div className="relative flex items-center justify-center mb-2">
          <ProgressRing value={percentage} color={data.ringColor} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-bold tabular-nums">
              {data.formatValue(data.current)}
            </span>
            {hasGoal && (
              <span className="text-xs text-muted-foreground tabular-nums">
                /{data.formatValue(data.target)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {data.icon}
          <span className="text-xs font-medium text-muted-foreground capitalize">
            {data.label}
          </span>
        </div>
        {!hasGoal && onAddGoal && (
          <p className="text-[10px] text-muted-foreground mt-1">Tap to set goal</p>
        )}
        {hasGoal && onAdd && (
          <p className="text-[10px] text-primary mt-1 flex items-center gap-0.5">
            <Plus className="h-2.5 w-2.5" />
            {data.addLabel}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export interface DashboardProgressCardsProps {
  onAddGoal?: () => void;
  onAddWorkout?: () => void;
  onAddFood?: () => void;
  onAddSleep?: () => void;
}

export function DashboardProgressCards({
  onAddGoal,
  onAddWorkout,
  onAddFood,
  onAddSleep,
}: DashboardProgressCardsProps) {
  const { goals } = useGoals();
  const { workouts } = useWorkouts();
  const { foodEntries, checkIns } = useEnergy();
  const { calorieGoal: macroCalorieGoal } = useMacroGoals();

  const cardsData = useMemo((): ProgressCardData[] => {
    const now = new Date();

    const workoutsGoal = goals.find((g) => g.type === 'workouts');
    const sleepGoal = goals.find((g) => g.type === 'sleep');

    const wr = workoutsGoal ? getPeriodRange(workoutsGoal.period, now) : getPeriodRange('weekly', now);
    const cr = getPeriodRange('daily', now);
    const sr = sleepGoal ? getPeriodRange(sleepGoal.period, now) : getPeriodRange('weekly', now);

    const workoutsCurrent = workouts.filter((w) =>
      isWithinInterval(new Date(w.date), wr)
    ).length;
    const caloriesCurrent = foodEntries
      .filter((f) => isWithinInterval(new Date(f.date), cr))
      .reduce((sum, f) => sum + f.calories, 0);
    const sleepCheckIns = checkIns
      .filter((c) => isWithinInterval(new Date(c.date), sr))
      .filter((c) => c.sleepHours != null);
    const sleepCurrent =
      sleepCheckIns.length > 0
        ? sleepCheckIns.reduce((s, c) => s + (c.sleepHours ?? 0), 0) / sleepCheckIns.length
        : 0;

    return [
      {
        current: workoutsCurrent,
        target: workoutsGoal?.target ?? 0,
        label: 'Workouts',
        addLabel: 'Add workout',
        cardType: 'workouts' as CardType,
        formatValue: (v) => Math.round(v).toString(),
        icon: <Dumbbell className="h-4 w-4 text-blue-600" />,
        ringColor: '#2563eb',
        goal: workoutsGoal,
      },
      {
        current: caloriesCurrent,
        target: macroCalorieGoal,
        label: 'Calories',
        addLabel: 'Log food',
        cardType: 'calories' as CardType,
        formatValue: (v) => Math.round(v).toLocaleString(),
        icon: <Flame className="h-4 w-4 text-orange-600" />,
        ringColor: '#22c55e',
      },
      {
        current: sleepCurrent,
        target: sleepGoal?.target ?? 0,
        label: 'Avg sleep',
        addLabel: 'Log sleep',
        cardType: 'sleep' as CardType,
        formatValue: (v) => (v > 0 ? `${v.toFixed(1)}h` : '0h'),
        icon: <Moon className="h-4 w-4 text-indigo-600" />,
        ringColor: '#6366f1',
        goal: sleepGoal,
      },
    ];
  }, [goals, workouts, foodEntries, checkIns, macroCalorieGoal]);

  const getOnAdd = (cardType: CardType) => {
    if (cardType === 'workouts') return onAddWorkout;
    if (cardType === 'calories') return onAddFood;
    if (cardType === 'sleep') return onAddSleep;
    return undefined;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cardsData.map((data, i) => (
        <ProgressCard
          key={i}
          data={data}
          onAddGoal={onAddGoal}
          onAdd={getOnAdd(data.cardType)}
        />
      ))}
    </div>
  );
}
