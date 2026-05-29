import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TileStatus = 'ok' | 'warn' | 'bad' | 'neutral';

const STATUS_STYLES: Record<TileStatus, string> = {
  ok: 'border-emerald-500/30 bg-emerald-500/5',
  warn: 'border-amber-500/40 bg-amber-500/5',
  bad: 'border-red-500/40 bg-red-500/5',
  neutral: 'border-border bg-muted/20',
};

const ICON_STYLES: Record<TileStatus, string> = {
  ok: 'text-emerald-500',
  warn: 'text-amber-500',
  bad: 'text-red-500',
  neutral: 'text-muted-foreground',
};

interface MetricTileProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  status?: TileStatus;
  icon?: LucideIcon;
}

/** Compact KPI tile used across the observability dashboard. */
export function MetricTile({ label, value, sub, status = 'neutral', icon: Icon }: MetricTileProps) {
  return (
    <div className={cn('rounded-xl border p-4 flex flex-col gap-1', STATUS_STYLES[status])}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {Icon && <Icon className={cn('h-3.5 w-3.5', ICON_STYLES[status])} />}
        <span className="truncate">{label}</span>
      </div>
      <div className="text-2xl font-semibold tabular-nums leading-tight">{value}</div>
      {sub != null && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
