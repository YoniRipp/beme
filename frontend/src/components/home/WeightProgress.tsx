import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWeight } from '@/hooks/useWeight';
import { useProfile } from '@/hooks/useProfile';
import { Scale, TrendingDown, TrendingUp, Minus, Plus } from 'lucide-react';
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
      <Card className="overflow-hidden cursor-pointer hover:border-primary/30 hover:bg-muted/40 transition-colors press" onClick={() => setModalOpen(true)} role="button">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Scale className="w-4 h-4 text-primary" />
              </div>
              <h3 className="font-display text-base font-medium tracking-tight">Weight</h3>
            </div>
            <div className="flex items-center gap-1 text-xs text-primary font-medium">
              <Plus className="w-3 h-3" />
              Log
            </div>
          </div>

          {current ? (
            <div className="space-y-2.5">
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-3xl font-medium tabular-nums leading-none">{current.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">kg</span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                {target && (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Target</span>
                    <span className="font-medium tabular-nums">{target}kg</span>
                    {diff != null && (
                      <span className={`tabular-nums ${diff > 0 ? 'text-warning' : 'text-success'}`}>
                        ({diff > 0 ? '+' : ''}{diff.toFixed(1)})
                      </span>
                    )}
                  </div>
                )}
                {trend !== null && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    {trend < 0 ? (
                      <TrendingDown className="w-3 h-3 text-success" />
                    ) : trend > 0 ? (
                      <TrendingUp className="w-3 h-3 text-warning" />
                    ) : (
                      <Minus className="w-3 h-3" />
                    )}
                    <span className="tabular-nums">{Math.abs(trend).toFixed(1)} kg / wk</span>
                  </div>
                )}
              </div>

              {recentEntries.length >= 2 && (
                <div className="flex items-end gap-[2px] h-8 mt-1">
                  {[...recentEntries].reverse().map((entry, i) => {
                    const min = Math.min(...recentEntries.map((e) => e.weight));
                    const max = Math.max(...recentEntries.map((e) => e.weight));
                    const range = max - min || 1;
                    const height = ((entry.weight - min) / range) * 100;
                    return (
                      <div
                        key={entry.id || i}
                        className="flex-1 bg-primary/40 rounded-t-sm transition-all"
                        style={{ height: `${Math.max(height, 10)}%` }}
                        title={`${entry.weight} kg`}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-3">
              <p className="text-sm text-muted-foreground mb-3">No weight logged yet</p>
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
