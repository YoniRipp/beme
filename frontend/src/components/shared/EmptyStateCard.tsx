import { type LucideIcon, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface EmptyStateCardProps {
  onClick: () => void;
  icon?: LucideIcon;
  title: string;
  description?: string;
}

export function EmptyStateCard({ onClick, icon: Icon = Plus, title, description }: EmptyStateCardProps) {
  return (
    <Card
      className="p-8 text-center cursor-pointer hover:border-primary/40 hover:bg-muted/40 transition-colors press"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <p className="font-display text-lg font-medium text-foreground tracking-tight">{title}</p>
      {description && <p className="text-sm text-muted-foreground mt-1.5 max-w-xs mx-auto leading-relaxed">{description}</p>}
      <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
        <Plus className="w-4 h-4" />
        Get started
      </div>
    </Card>
  );
}
