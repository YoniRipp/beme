import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// `formatDate` and `getWeightUnit` now live in @trackvibe/shared/domain so the Expo client
// renders a user-facing date and weight unit exactly as the web does — it previously had
// neither and hardcoded both. Re-exported here so every existing `@/lib/utils` import site
// keeps working unchanged.
export { formatDate, getWeightUnit } from '@trackvibe/shared/domain';

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

/**
 * Treat (dateStr, timeStr) as UTC and return the same time formatted in the user's local timezone (e.g. "10:00 AM").
 * Used for schedule items stored in UTC so we display "true time ± offset".
 */
export function utcScheduleTimeToLocal(dateStr: string, timeStr: string, timeZone?: string): string {
  const utc = new Date(`${dateStr}T${timeStr}:00.000Z`);
  if (isNaN(utc.getTime())) return formatTime(timeStr);
  const tz = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const result = formatter.format(utc);
  return result;
}

/**
 * Treat (dateStr, timeStr) as UTC and return the local calendar date (YYYY-MM-DD) in the user's timezone.
 * Used to group schedule items by day in week/list views.
 */
export function utcScheduleToLocalDateStr(dateStr: string, timeStr: string, timeZone?: string): string {
  const utc = new Date(`${dateStr}T${timeStr}:00.000Z`);
  if (isNaN(utc.getTime())) return dateStr;
  const tz = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = formatter.formatToParts(utc);
  const y = parts.find((p) => p.type === 'year')?.value ?? '';
  const m = parts.find((p) => p.type === 'month')?.value.padStart(2, '0') ?? '';
  const d = parts.find((p) => p.type === 'day')?.value.padStart(2, '0') ?? '';
  return `${y}-${m}-${d}`;
}

/** True if the given end time (HH:MM) has already passed today (legacy: treats endTime as local). */
export function isScheduleItemPast(endTime: string): boolean {
  const now = new Date();
  const [h, m] = endTime.split(':').map(Number);
  const endMinutes = (h ?? 0) * 60 + (m ?? 0);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes > endMinutes;
}

/** True if the UTC moment (dateStr + endTime) has already passed. Use for schedule items stored in UTC. */
export function isScheduleItemPastUtc(dateStr: string, endTime: string): boolean {
  const utc = new Date(`${dateStr}T${endTime}:00.000Z`);
  return !isNaN(utc.getTime()) && Date.now() > utc.getTime();
}

export function getMonthName(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date);
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

export function startOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
}

export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  return d1.toDateString() === d2.toDateString();
}
