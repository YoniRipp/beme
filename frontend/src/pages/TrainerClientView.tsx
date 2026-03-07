import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ArrowLeft, Dumbbell, UtensilsCrossed, Moon, Target } from 'lucide-react';
import {
  useTrainerClients,
  useTrainerClientWorkouts,
  useTrainerClientFoodEntries,
  useTrainerClientCheckIns,
  useTrainerClientGoals,
} from '@/hooks/useTrainer';

export default function TrainerClientView() {
  const { clientId = '' } = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  const { data: clients = [] } = useTrainerClients();
  const client = clients.find((c) => c.clientId === clientId);

  const { data: workoutsData, isLoading: loadingWorkouts } = useTrainerClientWorkouts(clientId);
  const { data: foodData, isLoading: loadingFood } = useTrainerClientFoodEntries(clientId);
  const { data: checkInsData, isLoading: loadingCheckIns } = useTrainerClientCheckIns(clientId);
  const { data: goalsData, isLoading: loadingGoals } = useTrainerClientGoals(clientId);

  const workouts = workoutsData?.data ?? [];
  const foodEntries = foodData?.data ?? [];
  const checkIns = checkInsData?.data ?? [];
  const goals = goalsData?.data ?? [];

  const isLoading = loadingWorkouts || loadingFood || loadingCheckIns || loadingGoals;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/trainer')}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-charcoal">
            {client?.clientName ?? 'Client'}
          </h1>
          {client?.clientEmail && (
            <p className="text-sm text-stone">{client.clientEmail}</p>
          )}
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Loading client data..." />
      ) : (
        <Tabs defaultValue="workouts">
          <TabsList>
            <TabsTrigger value="workouts" className="gap-1.5">
              <Dumbbell className="w-3.5 h-3.5" />
              Workouts ({workouts.length})
            </TabsTrigger>
            <TabsTrigger value="food" className="gap-1.5">
              <UtensilsCrossed className="w-3.5 h-3.5" />
              Food ({foodEntries.length})
            </TabsTrigger>
            <TabsTrigger value="checkins" className="gap-1.5">
              <Moon className="w-3.5 h-3.5" />
              Check-ins ({checkIns.length})
            </TabsTrigger>
            <TabsTrigger value="goals" className="gap-1.5">
              <Target className="w-3.5 h-3.5" />
              Goals ({goals.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workouts" className="mt-4">
            <DataList
              items={workouts}
              emptyMessage="No workouts recorded yet."
              renderItem={(item: Record<string, unknown>) => (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-charcoal">
                      {String(item.title || 'Workout')}
                    </p>
                    <p className="text-xs text-stone">
                      {String(item.date || '')} - {String(item.type || 'strength')}
                      {item.durationMinutes ? ` - ${item.durationMinutes} min` : ''}
                    </p>
                  </div>
                  {Array.isArray(item.exercises) && (
                    <span className="text-xs text-stone">
                      {item.exercises.length} exercise{item.exercises.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )}
            />
          </TabsContent>

          <TabsContent value="food" className="mt-4">
            <DataList
              items={foodEntries}
              emptyMessage="No food entries recorded yet."
              renderItem={(item: Record<string, unknown>) => (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-charcoal">
                      {String(item.name || 'Food')}
                    </p>
                    <p className="text-xs text-stone">
                      {String(item.date || '')}
                      {item.mealType ? ` - ${item.mealType}` : ''}
                    </p>
                  </div>
                  {item.calories != null && (
                    <span className="text-xs text-stone">{String(item.calories)} cal</span>
                  )}
                </div>
              )}
            />
          </TabsContent>

          <TabsContent value="checkins" className="mt-4">
            <DataList
              items={checkIns}
              emptyMessage="No check-ins recorded yet."
              renderItem={(item: Record<string, unknown>) => (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-charcoal">
                      {String(item.date || '')}
                    </p>
                    <p className="text-xs text-stone">
                      {item.sleepHours != null ? `Sleep: ${item.sleepHours}h` : ''}
                      {item.energyLevel != null ? ` | Energy: ${item.energyLevel}/10` : ''}
                      {item.mood != null ? ` | Mood: ${item.mood}/10` : ''}
                    </p>
                  </div>
                </div>
              )}
            />
          </TabsContent>

          <TabsContent value="goals" className="mt-4">
            <DataList
              items={goals}
              emptyMessage="No goals set yet."
              renderItem={(item: Record<string, unknown>) => (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-charcoal">
                      {String(item.type || 'Goal')}: {String(item.target || '')}
                    </p>
                    <p className="text-xs text-stone">
                      {String(item.period || '')}
                      {item.startDate ? ` | ${item.startDate}` : ''}
                    </p>
                  </div>
                </div>
              )}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

interface DataListProps {
  items: Record<string, unknown>[];
  emptyMessage: string;
  renderItem: (item: Record<string, unknown>) => React.ReactNode;
}

function DataList({ items, emptyMessage, renderItem }: DataListProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-stone text-sm">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-stone">{items.length} entries</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={String(item.id ?? index)}
              className="p-3 rounded-lg border border-border hover:bg-cream-warm/30 transition-colors"
            >
              {renderItem(item)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
