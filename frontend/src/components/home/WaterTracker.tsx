import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWater } from '@/hooks/useWater';
import { useProfile } from '@/hooks/useProfile';
import { Droplets, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';

export function WaterTracker() {
  const { glasses, mlTotal, addGlass, removeGlass, waterLoading } = useWater();
  const { profile } = useProfile();
  const goal = profile.waterGoalGlasses || 8;
  const pct = Math.min(glasses / goal, 1);

  const handleAdd = async () => {
    try {
      await addGlass();
    } catch {
      toast.error('Could not log water');
    }
  };

  const handleRemove = async () => {
    if (glasses <= 0) return;
    try {
      await removeGlass();
    } catch {
      toast.error('Could not update water');
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-info/10 flex items-center justify-center">
              <Droplets className="w-4 h-4 text-info" />
            </div>
            <h3 className="font-display text-base font-medium tracking-tight">Water</h3>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">{mlTotal} ml</span>
        </div>

        <div className="flex items-baseline gap-1.5 mb-3">
          <span className="font-display text-3xl font-medium tabular-nums leading-none">{glasses}</span>
          <span className="text-sm text-muted-foreground">/ {goal} glasses</span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-info rounded-full transition-all duration-500"
            style={{ width: `${pct * 100}%` }}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={handleRemove}
            disabled={glasses <= 0 || waterLoading}
            aria-label="Remove a glass"
          >
            <Minus className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1 rounded-full h-9"
            onClick={handleAdd}
            disabled={waterLoading}
          >
            <Plus className="w-3.5 h-3.5" />
            Add glass
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
