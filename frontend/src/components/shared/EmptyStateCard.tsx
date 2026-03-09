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
      className="p-8 border-2 border-dashed cursor-pointer hover:border-primary transition-colors text-center"
      onClick={onClick}
    >
      <Icon className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
      <p className="text-lg font-medium mb-1">{title}</p>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </Card>
  );
}
