import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWeight } from '@/hooks/useWeight';
import { useProfile } from '@/hooks/useProfile';
import { Scale, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { WeightLogModal } from './WeightLogModal';

export function WeightProgress() {
  const { weightEntries, latestWeight } = useWeight();
  const { profile } = useProfile();
  const [modalOpen, setModalOpen] = useState(false);

  const target = profile.targetWeight;
  const current = latestWeight?.weight;
  const diff = current && target ? current - target : null;

  const recentEntries = weightEntries.slice(0, 7);
  const trend = recentEntries.length >= 2
    ? recentEntries[0].weight - recentEntries[recentEntries.length - 1].weight
    : null;

  return (
    <>
      <Card className="rounded-2xl overflow-hidden cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setModalOpen(true)} role="button">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Scale className="w-4 h-4 text-purple-500" />
            <h3 className="text-sm font-medium">Weight</h3>
          </div>

          {current ? (
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tabular-nums">{current.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">kg</span>
              </div>

              <div className="flex items-center gap-4 text-xs">
                {target && (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Target:</span>
                    <span className="font-medium">{target} kg</span>
                    {diff != null && (
                      <span className={diff > 0 ? 'text-orange-500' : 'text-green-500'}>
                        ({diff > 0 ? '+' : ''}{diff.toFixed(1)})
                      </span>
                    )}
                  </div>
                )}
                {trend !== null && (
                  <div className="flex items-center gap-1">
                    {trend < 0 ? (
                      <TrendingDown className="w-3 h-3 text-green-500" />
                    ) : trend > 0 ? (
                      <TrendingUp className="w-3 h-3 text-orange-500" />
                    ) : (
                      <Minus className="w-3 h-3 text-muted-foreground" />
                    )}
                    <span className="text-muted-foreground">
                      {Math.abs(trend).toFixed(1)} kg / week
                    </span>
                  </div>
                )}
              </div>

              {recentEntries.length >= 2 && (
                <div className="flex items-end gap-[2px] h-8 mt-2">
                  {[...recentEntries].reverse().map((entry, i) => {
                    const min = Math.min(...recentEntries.map((e) => e.weight));
                    const max = Math.max(...recentEntries.map((e) => e.weight));
                    const range = max - min || 1;
                    const height = ((entry.weight - min) / range) * 100;
                    return (
                      <div
                        key={entry.id || i}
                        className="flex-1 bg-purple-400/60 rounded-t-sm transition-all"
                        style={{ height: `${Math.max(height, 10)}%` }}
                        title={`${entry.weight} kg`}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-sm text-muted-foreground mb-2">No weight logged yet</p>
              <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>
                Log your weight
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <WeightLogModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
