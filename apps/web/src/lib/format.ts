const usdFormatter = new Intl.NumberFormat("en", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const compactUsdFormatter = new Intl.NumberFormat("en", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const countFormatter = new Intl.NumberFormat("en");

// "$1,112.31"
export const formatUsd = (value: number) => usdFormatter.format(Number(value || 0));

// "$1.2K", for chart axes
export const formatUsdCompact = (value: number) => compactUsdFormatter.format(Number(value || 0));

export const formatCount = (value: number) => countFormatter.format(value);

// crypto amounts keep more precision: "0.5", "1.234567"
export const formatAmount = (value: number) => Number(value || 0).toLocaleString("en", { maximumFractionDigits: 6 });

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

/** "12m ago" style recency, falling back to a date after 30 days. */
export function formatRelative(value: Date | string | null | undefined) {
  if (!value) return "Never";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  const elapsed = Date.now() - date.getTime();
  if (elapsed < 0) return formatDate(date);
  if (elapsed < 60_000) return "Just now";
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days <= 30) return `${days}d ago`;
  return formatDate(date);
}

// "YYYY-MM-DD" (a UTC day) -> "Nov 6"
export const formatDay = (day: string) =>
  new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));

// entry dates are stored and grouped by UTC day, so ranges are computed in UTC too
export const startOfUtcMonth = (d = new Date()) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
export const startOfUtcDayDaysAgo = (days: number, d = new Date()) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - days));

// every UTC day between two dates, inclusive, as "YYYY-MM-DD"
export function utcDaysBetween(from: Date, to: Date): string[] {
  const days: string[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  while (cursor <= to) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export type Interval = "day" | "week" | "month";

// UTC start of the day / week (Monday, like Postgres date_trunc) / month containing `d`
export function startOfUtcPeriod(d: Date, interval: Interval) {
  if (interval === "month") return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  if (interval === "week") day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day;
}

// every bucket start between two dates, inclusive, as "YYYY-MM-DD"
export function utcPeriodsBetween(from: Date, to: Date, interval: Interval): string[] {
  const periods: string[] = [];
  const cursor = startOfUtcPeriod(from, interval);
  while (cursor <= to) {
    periods.push(cursor.toISOString().slice(0, 10));
    if (interval === "month") cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    else cursor.setUTCDate(cursor.getUTCDate() + (interval === "week" ? 7 : 1));
  }
  return periods;
}

const monthFormatter = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" });
const monthYearFormatter = new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" });

// short axis label for a bucket: "Nov 6" for days and weeks, "Nov" for months
export const formatPeriodShort = (period: string, interval: Interval) =>
  interval === "month" ? monthFormatter.format(new Date(`${period}T00:00:00Z`)) : formatDay(period);

// tooltip label for a bucket: "Nov 6", "Week of Nov 3", "November 2026"
export function formatPeriod(period: string, interval: Interval) {
  if (interval === "month") return monthYearFormatter.format(new Date(`${period}T00:00:00Z`));
  return interval === "week" ? `Week of ${formatDay(period)}` : formatDay(period);
}
