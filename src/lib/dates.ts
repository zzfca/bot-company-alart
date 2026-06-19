import { differenceInDays, parseISO, startOfDay } from 'date-fns';

export function getDaysUntil(dateStr: string): number {
  if (!dateStr) return Infinity;
  const today = startOfDay(new Date());
  const target = startOfDay(parseISO(dateStr));
  return differenceInDays(target, today);
}

export function getDaysFromNow(dateStr: string): number {
  if (!dateStr) return Infinity;
  const today = startOfDay(new Date());
  const target = startOfDay(parseISO(dateStr));
  return differenceInDays(today, target);
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
