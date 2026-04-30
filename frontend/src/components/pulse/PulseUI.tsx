import type React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PulsePage({
  children,
  className,
  narrow = false,
}: {
  children: React.ReactNode;
  className?: string;
  narrow?: boolean;
}) {
  return (
    <div className={cn(narrow ? 'mx-auto w-full max-w-lg' : 'mx-auto w-full max-w-6xl', 'space-y-5', className)}>
      {children}
    </div>
  );
}

export function PulseHeader({
  kicker,
  title,
  subtitle,
  action,
  className,
}: {
  kicker?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        {kicker && (
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {kicker}
          </p>
        )}
        <h1 className="mt-1 font-sans text-[28px] font-extrabold leading-tight tracking-tight md:text-[34px]">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function PulseCard({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-[22px] border border-border bg-card text-card-foreground shadow-card', className)} {...props}>
      {children}
    </div>
  );
}

export function PulseSectionHeader({
  title,
  eyebrow,
  action,
  className,
}: {
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-end justify-between gap-4 px-1', className)}>
      <div>
        {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{eyebrow}</p>}
        <h2 className="mt-1 text-base font-bold tracking-tight">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function PulseRing({
  pct,
  size = 132,
  stroke = 11,
  colorClass = 'text-primary',
  children,
  className,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  colorClass?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const normalized = Math.max(0, Math.min(1, pct));

  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - normalized)}
          className={cn('transition-all duration-700 ease-out', colorClass)}
        />
      </svg>
      {children && <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>}
    </div>
  );
}

export function PulseStatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'text-primary',
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  sub: React.ReactNode;
  color?: string;
  onClick?: () => void;
}) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-label={onClick ? label : undefined}
      className={cn(
        'min-h-[100px] rounded-[18px] border border-border bg-card p-3 text-left shadow-card press',
        onClick && 'cursor-pointer hover:border-primary/40',
      )}
    >
      <Icon className={cn('mb-2 h-4 w-4', color)} />
      <p className="text-[24px] font-extrabold leading-none tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{sub}</p>
    </Comp>
  );
}

export function PulseQuickTile({
  icon: Icon,
  label,
  pill,
  primary = false,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  pill?: React.ReactNode;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-[78px] flex-col justify-between rounded-[18px] p-3.5 text-left shadow-card press',
        primary
          ? 'border border-primary bg-primary text-primary-foreground'
          : 'border border-border bg-card text-foreground hover:border-primary/40',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <Icon className="h-[22px] w-[22px]" strokeWidth={2} />
        {pill && (
          <span
            className={cn(
              'rounded-lg px-2 py-1 text-[11px] font-bold tabular-nums',
              primary ? 'bg-background/15 text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}
          >
            {pill}
          </span>
        )}
      </div>
      <span className="text-sm font-bold tracking-tight">{label}</span>
    </button>
  );
}

export function PulseBackButton({ onClick, label = 'Back' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-card press"
      aria-label={label}
    >
      <ChevronLeft className="h-5 w-5" />
    </button>
  );
}

export function PulseWave({ active = true, className }: { active?: boolean; className?: string }) {
  return (
    <div className={cn('flex h-20 items-center justify-center gap-1.5', className)} aria-hidden="true">
      {Array.from({ length: 9 }).map((_, i) => (
        <span
          key={i}
          className={cn('w-1.5 rounded-full bg-primary', active ? 'animate-pulse-wave' : 'opacity-40')}
          style={{ height: 18 + ((i * 13) % 42), animationDelay: `${i * 70}ms` }}
        />
      ))}
    </div>
  );
}
