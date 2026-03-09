import { type LucideIcon, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface AddAnotherCardProps {
  onClick: () => void;
  icon?: LucideIcon;
  label: string;
}

export function AddAnotherCard({ onClick, icon: Icon = Plus, label }: AddAnotherCardProps) {
  return (
    <Card
      className="p-6 border-2 border-dashed cursor-pointer hover:border-primary transition-colors text-center bg-muted/50"
      onClick={onClick}
    >
      <Icon className="w-8 h-8 mx-auto text-primary" />
      <p className="text-sm font-medium mt-2 text-muted-foreground">{label}</p>
    </Card>
  );
}
