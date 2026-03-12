import { Flame, Dumbbell, UtensilsCrossed, Droplets, Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useStreaks } from '@/hooks/useStreaks';

const STREAK_CONFIG = {
  workout: { label: 'Workout', icon: Dumbbell, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950' },
  food: { label: 'Food', icon: UtensilsCrossed, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950' },
  water: { label: 'Water', icon: Droplets, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-950' },
} as const;

export function StreakCard() {
  const { workoutStreak, foodStreak, waterStreak, isLoading } = useStreaks();

  const streakItems = [
    { ...STREAK_CONFIG.workout, streak: workoutStreak },
    { ...STREAK_CONFIG.food, streak: foodStreak },
    { ...STREAK_CONFIG.water, streak: waterStreak },
  ];

  const hasAnyStreak = streakItems.some((s) => s.streak && s.streak.currentCount > 0);

  if (isLoading || !hasAnyStreak) return null;

  return (
    <Card className="rounded-2xl overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="h-4 w-4 text-orange-500" />
          <h3 className="text-sm font-medium text-muted-foreground">Streaks</h3>
        </div>
        <div className="flex gap-3">
          {streakItems.map(({ label, icon: Icon, color, bg, streak }) => {
            if (!streak || streak.currentCount === 0) return null;
            return (
              <div key={label} className="flex-1 text-center">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${bg} mb-1.5`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div className="text-lg font-bold leading-tight">{streak.currentCount}</div>
                <div className="text-[10px] text-muted-foreground">{label}</div>
                {streak.bestCount > streak.currentCount && (
                  <div className="flex items-center justify-center gap-0.5 mt-0.5">
                    <Trophy className="h-2.5 w-2.5 text-amber-400" />
                    <span className="text-[9px] text-muted-foreground">{streak.bestCount}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
