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
    <Card className="rounded-2xl overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-medium">Water</h3>
          </div>
          <span className="text-xs text-muted-foreground">{mlTotal} ml</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            {/* Glass indicators */}
            <div className="flex gap-1 mb-2">
              {Array.from({ length: goal }, (_, i) => (
                <div
                  key={i}
                  className={`h-6 flex-1 rounded-sm transition-colors ${
                    i < glasses ? 'bg-blue-500' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm">
              <span className="font-semibold">{glasses}</span>
              <span className="text-muted-foreground">/{goal} glasses</span>
            </p>
          </div>

          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={handleRemove}
              disabled={glasses <= 0 || waterLoading}
            >
              <Minus className="w-3 h-3" />
            </Button>
            <Button
              variant="default"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={handleAdd}
              disabled={waterLoading}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${pct * 100}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
