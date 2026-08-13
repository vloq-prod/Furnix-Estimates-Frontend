import { formatPaise, formatRupees, toPaise } from '@furnix/shared';

export { formatPaise, formatRupees, toPaise };

/** Format a Decimal-as-string straight from the API. */
export const inr = (value: string | number | null | undefined): string =>
  formatPaise(toPaise(String(value ?? 0)));

/** Digits only, for right-aligned table cells under a ₹ header. */
export const inrPlain = (value: string | number | null | undefined): string =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number(value ?? 0),
  );

export const shortDate = (value: string | Date): string =>
  new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(value),
  );

export const dateTime = (value: string | Date): string =>
  new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

/** For <input type="date">. */
export const toDateInput = (value: string | Date): string =>
  new Date(value).toISOString().slice(0, 10);

export const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const relativeTime = (value: string | Date): string => {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return shortDate(value);
};

export const daysUntil = (value: string | Date): number =>
  Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);

export const cx = (...classes: (string | false | null | undefined)[]): string =>
  classes.filter(Boolean).join(' ');
