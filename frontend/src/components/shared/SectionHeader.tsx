import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function SectionHeader({ title, subtitle, actionLabel, onAction, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3 mb-4', className)}>
      <div>
        <h3 className="font-display text-xl font-medium tracking-tight text-foreground">{title}</h3>
        {subtitle != null && <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{subtitle}</p>}
      </div>
      {actionLabel != null && onAction != null && (
        <Button size="sm" variant="outline" onClick={onAction} aria-label={actionLabel}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
