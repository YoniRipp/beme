import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type StatCardColor = 'sage' | 'terracotta' | 'gold' | 'blue';

const ICON_CLASSES: Record<StatCardColor, string> = {
  sage: 'bg-primary/10 text-primary',
  terracotta: 'bg-terracotta/10 text-terracotta',
  gold: 'bg-gold/10 text-gold',
  blue: 'bg-info/10 text-info',
};

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sublabel?: string;
  color?: StatCardColor;
  className?: string;
}

export function StatCard({ icon: Icon, label, value, sublabel, color = 'sage', className }: StatCardProps) {
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground mb-1.5">{label}</p>
          <p className="font-display text-3xl font-medium tabular-nums leading-none tracking-tight text-foreground">
            {value}
            {sublabel != null && (
              <span className="ml-1.5 text-base font-sans font-normal text-muted-foreground tracking-normal">
                {sublabel}
              </span>
            )}
          </p>
        </div>
        <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0', ICON_CLASSES[color])}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
    </Card>
  );
}
