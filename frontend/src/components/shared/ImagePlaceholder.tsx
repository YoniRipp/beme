import { UtensilsCrossed, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';

const CONFIG = {
  food: {
    icon: UtensilsCrossed,
    bg: 'bg-orange-100',
    text: 'text-orange-500',
  },
  exercise: {
    icon: Dumbbell,
    bg: 'bg-blue-100',
    text: 'text-blue-500',
  },
} as const;

const SIZES = {
  sm: { container: 'w-10 h-10', icon: 'w-5 h-5' },
  md: { container: 'w-12 h-12', icon: 'w-6 h-6' },
  lg: { container: 'w-16 h-16', icon: 'w-8 h-8' },
} as const;

interface ImagePlaceholderProps {
  type: 'food' | 'exercise';
  size?: 'sm' | 'md' | 'lg';
  imageUrl?: string;
  className?: string;
}

export function ImagePlaceholder({ type, size = 'md', imageUrl, className }: ImagePlaceholderProps) {
  const { icon: Icon, bg, text } = CONFIG[type];
  const { container, icon } = SIZES[size];

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className={cn('rounded-xl object-cover shrink-0', container, className)}
        loading="lazy"
      />
    );
  }

  return (
    <div className={cn('rounded-xl flex items-center justify-center shrink-0', bg, container, className)}>
      <Icon className={cn(icon, text)} aria-hidden="true" />
    </div>
  );
}
