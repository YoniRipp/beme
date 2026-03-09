import { Pencil } from 'lucide-react';

interface MacroData {
  current: number;
  goal: number;
}

interface MacroCirclesProps {
  carbs: MacroData;
  fat: MacroData;
  protein: MacroData;
  onEditGoals?: () => void;
}

const R = 32;
const CIRCUMFERENCE = 2 * Math.PI * R;

function MacroRing({
  label,
  current,
  goal,
  color,
}: {
  label: string;
  current: number;
  goal: number;
  color: string;
}) {
  const pct = goal > 0 ? Math.min(current / goal, 1) : 0;
  const offset = CIRCUMFERENCE * (1 - pct);
  const remaining = Math.max(goal - current, 0);

  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <p className="text-xs font-medium text-primary mb-1">{label}</p>
      <div className="relative w-[76px] h-[76px]">
        <svg className="w-[76px] h-[76px] -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40" cy="40" r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-muted"
          />
          <circle
            cx="40" cy="40" r={R}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold leading-none tabular-nums">{Math.round(current)}</span>
          <span className="text-[10px] text-muted-foreground leading-none mt-0.5">/{goal}g</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{Math.round(remaining)}g left</p>
    </div>
  );
}

export function MacroCircles({ carbs, fat, protein, onEditGoals }: MacroCirclesProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Macros</p>
        {onEditGoals && (
          <button
            type="button"
            onClick={onEditGoals}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Edit macro goals"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="flex items-start justify-center gap-2">
      <MacroRing
        label="Carbs"
        current={carbs.current}
        goal={carbs.goal}
        color="hsl(138, 15%, 54%)"
      />
      <MacroRing
        label="Fat"
        current={fat.current}
        goal={fat.goal}
        color="hsl(17, 48%, 60%)"
      />
      <MacroRing
        label="Protein"
        current={protein.current}
        goal={protein.goal}
        color="hsl(210, 60%, 50%)"
      />
      </div>
    </div>
  );
}
