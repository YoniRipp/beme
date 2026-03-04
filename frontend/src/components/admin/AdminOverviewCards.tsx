import { Users, Dumbbell, Apple, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAdminStats } from '@/hooks/useAdminStats';

const cards = [
  {
    key: 'users' as const,
    label: 'Total Users',
    icon: Users,
    color: 'border-l-blue-500',
    iconColor: 'text-blue-500',
    getValue: (o: { totalUsers: number }) => o.totalUsers,
    getSub: (o: { newUsersToday: number; newUsersThisWeek: number }) =>
      `+${o.newUsersToday} today, +${o.newUsersThisWeek} this week`,
  },
  {
    key: 'workouts' as const,
    label: 'Workouts Today',
    icon: Dumbbell,
    color: 'border-l-green-500',
    iconColor: 'text-green-500',
    getValue: (o: { workoutsToday: number }) => o.workoutsToday,
    getSub: () => 'Logged today',
  },
  {
    key: 'food' as const,
    label: 'Food Entries Today',
    icon: Apple,
    color: 'border-l-red-500',
    iconColor: 'text-red-500',
    getValue: (o: { foodEntriesToday: number }) => o.foodEntriesToday,
    getSub: () => 'Logged today',
  },
  {
    key: 'goals' as const,
    label: 'Active Goals',
    icon: Target,
    color: 'border-l-amber-500',
    iconColor: 'text-amber-500',
    getValue: (o: { activeGoals: number }) => o.activeGoals,
    getSub: () => 'Across all users',
  },
];

export function AdminOverviewCards() {
  const { data, isLoading } = useAdminStats();
  const overview = data?.overview;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.key} className={`border-l-4 ${card.color}`}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold">
                    {isLoading ? '—' : overview ? card.getValue(overview as never) : 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isLoading ? '' : overview ? card.getSub(overview as never) : ''}
                  </p>
                </div>
                <Icon className={`h-8 w-8 ${card.iconColor} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
