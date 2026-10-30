/**
 * Date helpers. All "today" logic is in Asia/Kolkata. Calendar dates are plain
 * 'YYYY-MM-DD' strings; arithmetic on them is done in UTC so the result never
 * depends on the server's timezone (Vercel runs in UTC, dev machines vary).
 */
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";

export const IST = "Asia/Kolkata";
const DAY_MS = 86_400_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateString(s: unknown): s is string {
  if (typeof s !== "string" || !DATE_RE.test(s)) return false;
  const t = toUtcMs(s);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
}

/** Today's calendar date in IST as 'YYYY-MM-DD'. */
export function todayIST(now: Date = new Date()): string {
  return format(new TZDate(now.getTime(), IST), "yyyy-MM-dd");
}

function toUtcMs(d: string): number {
  const [y, m, day] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, day);
}

function fromUtcMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(d: string, n: number): string {
  return fromUtcMs(toUtcMs(d) + n * DAY_MS);
}

/** Calendar days from b to a (a − b). */
export function diffDays(a: string, b: string): number {
  return Math.round((toUtcMs(a) - toUtcMs(b)) / DAY_MS);
}

export function dayIndexToDate(startDate: string, dayIndex: number): string {
  return addDays(startDate, dayIndex);
}

export function dateToDayIndex(startDate: string, date: string): number {
  return diffDays(date, startDate);
}

export function getTodayIndex(startDate: string, today: string = todayIST()): number {
  return dateToDayIndex(startDate, today);
}

export function planEndDate(startDate: string, planDays: number): string {
  return addDays(startDate, planDays - 1);
}

/** 1-based plan week for a dayIndex. */
export function weekOf(dayIndex: number): number {
  return Math.floor(dayIndex / 7) + 1;
}

/** Format a 'YYYY-MM-DD' calendar date; independent of the machine's timezone. */
export function formatDate(d: string, pattern = "d MMM yyyy"): string {
  return format(new TZDate(toUtcMs(d), "UTC"), pattern);
}

export function weekdayShort(d: string): string {
  return formatDate(d, "EEE");
}

/** "5–11 Nov" or "26 Nov – 2 Dec" */
export function formatRange(from: string, to: string): string {
  const sameMonth = from.slice(0, 7) === to.slice(0, 7);
  return sameMonth
    ? `${formatDate(from, "d")}–${formatDate(to, "d MMM")}`
    : `${formatDate(from, "d MMM")} – ${formatDate(to, "d MMM")}`;
}

export function weekLabel(startDate: string, week: number): string {
  const from = addDays(startDate, (week - 1) * 7);
  const to = addDays(from, 6);
  return `Week ${week} · ${formatRange(from, to)}`;
}

/** Inclusive list of dates from → to. */
export function dateRange(from: string, to: string): string[] {
  const n = diffDays(to, from);
  if (n < 0) return [];
  return Array.from({ length: n + 1 }, (_, i) => addDays(from, i));
}

export function relativeDay(d: string, today: string): string {
  const n = diffDays(d, today);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}
