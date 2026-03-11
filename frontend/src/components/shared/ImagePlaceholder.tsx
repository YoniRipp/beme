import { UtensilsCrossed, Dumbbell, Heart, Footprints, Target, Zap, Activity, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

const MUSCLE_GROUP_CONFIG: Record<string, { icon: LucideIcon; bg: string; text: string }> = {
  chest: { icon: Target, bg: 'bg-red-100', text: 'text-red-500' },
  back: { icon: Activity, bg: 'bg-indigo-100', text: 'text-indigo-500' },
  legs: { icon: Footprints, bg: 'bg-green-100', text: 'text-green-500' },
  shoulders: { icon: Zap, bg: 'bg-amber-100', text: 'text-amber-500' },
  arms: { icon: Dumbbell, bg: 'bg-purple-100', text: 'text-purple-500' },
  core: { icon: Flame, bg: 'bg-orange-100', text: 'text-orange-500' },
  full_body: { icon: Heart, bg: 'bg-pink-100', text: 'text-pink-500' },
};

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
  muscleGroup?: string;
  className?: string;
}

export function ImagePlaceholder({ type, size = 'md', imageUrl, muscleGroup, className }: ImagePlaceholderProps) {
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

  // For exercises, use muscle-group-specific icon/color if available
  const mgConfig = type === 'exercise' && muscleGroup ? MUSCLE_GROUP_CONFIG[muscleGroup] : undefined;
  const { icon: Icon, bg, text } = mgConfig ?? CONFIG[type];

  return (
    <div className={cn('rounded-xl flex items-center justify-center shrink-0', bg, container, className)}>
      <Icon className={cn(icon, text)} aria-hidden="true" />
    </div>
  );
}
