import { type LucideIcon, Plus } from 'lucide-react';

interface AddAnotherCardProps {
  onClick: () => void;
  icon?: LucideIcon;
  label: string;
}

export function AddAnotherCard({ onClick, icon: Icon = Plus, label }: AddAnotherCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-dashed border-border bg-card/35 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/[0.06] transition-colors press"
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
