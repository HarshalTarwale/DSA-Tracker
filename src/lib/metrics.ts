/**
 * Pure, framework-free metric math (Section 11 of the spec). Unit-tested in tests/metrics.test.ts.
 * Inputs are plain objects so the same code runs on DB rows, test fixtures and backups.
 */
import { addDays, dateRange, diffDays, planEndDate } from "./dates";

export type Status = "not_started" | "attempted" | "solved" | "revised";
export type Difficulty = "easy" | "medium" | "hard";
export type How = "alone" | "hint" | "solution";
export type DayType = "study" | "review" | "mock" | "final";

export interface ProblemLike {
  id: number;
  difficulty: Difficulty;
  topicId: string;
  isCustom: boolean;
  status: Status;
  solvedAt: string | null;
  how?: How | null;
  timeMinutes?: number | null;
  redoFlag?: boolean;
  redo1DoneAt?: string | null;
  redo7DoneAt?: string | null;
  redo30DoneAt?: string | null;
}

export interface ScheduleDayLike {
  dayIndex: number;
  type: DayType;
  topicId: string | null;
  /** problem DB ids scheduled on this day */
  problemIds: number[];
}

export interface TopicLike {
  id: string;
  order: number;
}

export interface DiffCounts {
  easy: number;
  medium: number;
  hard: number;
  total: number;
}

const emptyCounts = (): DiffCounts => ({ easy: 0, medium: 0, hard: 0, total: 0 });

export function isDone(p: Pick<ProblemLike, "status">): boolean {
  return p.status === "solved" || p.status === "revised";
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function pct(solved: number, target: number): number {
  return target > 0 ? solved / target : 0;
}

/* ------------------------------------------------------------------------- */
/* Per-topic aggregation                                                     */
/* ------------------------------------------------------------------------- */

export type TopicStatus = "Not started" | "In progress" | "Completed";

export interface TopicStats {
  topicId: string;
  target: DiffCounts;
  solved: DiffCounts;
  pct: number;
  remaining: number;
  status: TopicStatus;
  startDate: string | null;
  endDate: string | null;
  studyDays: number;
  firstDayIndex: number | null;
  lastDayIndex: number | null;
}

export function topicStatus(solved: number, target: number): TopicStatus {
  if (solved === 0) return "Not started";
  if (solved >= target) return "Completed";
  return "In progress";
}

export function computeTopicStats(
  topics: TopicLike[],
  problems: ProblemLike[],
  schedule: ScheduleDayLike[],
  startDate: string,
): TopicStats[] {
  const byTopic = new Map<string, { target: DiffCounts; solved: DiffCounts }>();
  for (const t of topics) byTopic.set(t.id, { target: emptyCounts(), solved: emptyCounts() });
  for (const p of problems) {
    const agg = byTopic.get(p.topicId);
    if (!agg) continue;
    agg.target[p.difficulty]++;
    agg.target.total++;
    if (isDone(p)) {
      agg.solved[p.difficulty]++;
      agg.solved.total++;
    }
  }

  const days = new Map<string, number[]>();
  for (const d of schedule) {
    if (d.type !== "study" || !d.topicId) continue;
    const list = days.get(d.topicId) ?? [];
    list.push(d.dayIndex);
    days.set(d.topicId, list);
  }

  return [...topics]
    .sort((a, b) => a.order - b.order)
    .map((t) => {
      const agg = byTopic.get(t.id)!;
      const idx = days.get(t.id) ?? [];
      const first = idx.length ? Math.min(...idx) : null;
      const last = idx.length ? Math.max(...idx) : null;
      return {
        topicId: t.id,
        target: agg.target,
        solved: agg.solved,
        pct: pct(agg.solved.total, agg.target.total),
        remaining: agg.target.total - agg.solved.total,
        status: topicStatus(agg.solved.total, agg.target.total),
        startDate: first === null ? null : addDays(startDate, first),
        endDate: last === null ? null : addDays(startDate, last),
        studyDays: idx.length,
        firstDayIndex: first,
        lastDayIndex: last,
      };
    });
}

export function sumTopicStats(stats: TopicStats[]) {
  const target = emptyCounts();
  const solved = emptyCounts();
  let studyDays = 0;
  for (const s of stats) {
    for (const k of ["easy", "medium", "hard", "total"] as const) {
      target[k] += s.target[k];
      solved[k] += s.solved[k];
    }
    studyDays += s.studyDays;
  }
  return {
    target,
    solved,
    studyDays,
    pct: pct(solved.total, target.total),
    remaining: target.total - solved.total,
  };
}

/* ------------------------------------------------------------------------- */
/* KPIs                                                                      */
/* ------------------------------------------------------------------------- */

export interface Kpis {
  target: DiffCounts;
  solved: DiffCounts;
  pct: number;
  remaining: number;
  endDate: string;
  daysLeft: number;
  paceNeeded: number;
}

export function computeKpis(
  problems: ProblemLike[],
  startDate: string,
  planDays: number,
  today: string,
): Kpis {
  const target = emptyCounts();
  const solved = emptyCounts();
  for (const p of problems) {
    target[p.difficulty]++;
    target.total++;
    if (isDone(p)) {
      solved[p.difficulty]++;
      solved.total++;
    }
  }
  const endDate = planEndDate(startDate, planDays);
  const daysLeft = Math.max(0, diffDays(endDate, today));
  const remaining = target.total - solved.total;
  return {
    target,
    solved,
    pct: pct(solved.total, target.total),
    remaining,
    endDate,
    daysLeft,
    paceNeeded: paceNeeded(remaining, daysLeft),
  };
}

export function paceNeeded(remaining: number, daysLeft: number): number {
  return daysLeft > 0 ? round1(Math.max(0, remaining) / daysLeft) : 0;
}

/* ------------------------------------------------------------------------- */
/* Ahead / behind                                                            */
/* ------------------------------------------------------------------------- */

export type OnTrackTone = "ahead" | "on-track" | "behind" | "far-behind" | "not-started";

export interface OnTrack {
  plannedByYesterday: number;
  solvedPlanned: number;
  delta: number;
  tone: OnTrackTone;
  /** extra problems per day for a week to clear the backlog (only when behind) */
  extraPerDay: number;
  daysUntilStart: number;
}

export function computeOnTrack(
  problems: ProblemLike[],
  schedule: ScheduleDayLike[],
  todayIndex: number,
): OnTrack {
  const planned = new Set<number>();
  for (const p of problems) if (!p.isCustom) planned.add(p.id);

  let plannedByYesterday = 0;
  for (const d of schedule) {
    if (d.type !== "study" || d.dayIndex >= todayIndex) continue;
    for (const id of d.problemIds) if (planned.has(id)) plannedByYesterday++;
  }
  const solvedPlanned = problems.filter((p) => !p.isCustom && isDone(p)).length;
  const delta = solvedPlanned - plannedByYesterday;

  let tone: OnTrackTone;
  if (todayIndex < 0) tone = "not-started";
  else if (delta > 0) tone = "ahead";
  else if (delta === 0) tone = "on-track";
  else if (delta < -10) tone = "far-behind";
  else tone = "behind";

  return {
    plannedByYesterday,
    solvedPlanned,
    delta,
    tone,
    extraPerDay: delta < 0 ? Math.ceil(-delta / 7) : 0,
    daysUntilStart: todayIndex < 0 ? -todayIndex : 0,
  };
}

/* ------------------------------------------------------------------------- */
/* Plan curve vs actual                                                      */
/* ------------------------------------------------------------------------- */

export interface CurvePoint {
  dayIndex: number;
  date: string;
  planned: number;
  /** null for dates after today */
  actual: number | null;
}

/** planned(d) = cumulative count of planned problems on study days with dayIndex ≤ d. */
export function computePlanCurve(
  schedule: ScheduleDayLike[],
  problems: ProblemLike[],
  planDays: number,
): number[] {
  const planned = new Set<number>();
  for (const p of problems) if (!p.isCustom) planned.add(p.id);
  const perDay = new Array<number>(planDays).fill(0);
  for (const d of schedule) {
    if (d.type !== "study" || d.dayIndex < 0 || d.dayIndex >= planDays) continue;
    perDay[d.dayIndex] += d.problemIds.filter((id) => planned.has(id)).length;
  }
  let acc = 0;
  return perDay.map((n) => (acc += n));
}

/** For each plan date ≤ today: cumulative count of planned, currently-done problems with solvedAt ≤ date. */
export function computeCurve(
  schedule: ScheduleDayLike[],
  problems: ProblemLike[],
  startDate: string,
  planDays: number,
  today: string,
): CurvePoint[] {
  const plannedCurve = computePlanCurve(schedule, problems, planDays);
  const solvedDates = problems
    .filter((p) => !p.isCustom && isDone(p) && p.solvedAt)
    .map((p) => p.solvedAt as string)
    .sort();

  let cursor = 0;
  return plannedCurve.map((planned, dayIndex) => {
    const date = addDays(startDate, dayIndex);
    if (date > today) return { dayIndex, date, planned, actual: null };
    while (cursor < solvedDates.length && solvedDates[cursor] <= date) cursor++;
    return { dayIndex, date, planned, actual: cursor };
  });
}

/* ------------------------------------------------------------------------- */
/* Weekly buckets                                                            */
/* ------------------------------------------------------------------------- */

export interface WeekBucket {
  key: string;
  label: string;
  week: number; // 0 = pre-plan
  easy: number;
  medium: number;
  hard: number;
}

/** week = floor((solvedAt − startDate)/7) + 1; solves before the start → "Pre-plan". */
export function computeWeekly(
  problems: ProblemLike[],
  startDate: string,
  planWeeks: number,
): WeekBucket[] {
  const buckets = new Map<number, WeekBucket>();
  const make = (week: number): WeekBucket => ({
    key: week === 0 ? "pre" : `w${week}`,
    label: week === 0 ? "Pre-plan" : `W${week}`,
    week,
    easy: 0,
    medium: 0,
    hard: 0,
  });
  for (let w = 1; w <= planWeeks; w++) buckets.set(w, make(w));

  for (const p of problems) {
    if (!isDone(p) || !p.solvedAt) continue;
    const d = diffDays(p.solvedAt, startDate);
    const week = d < 0 ? 0 : Math.floor(d / 7) + 1;
    if (!buckets.has(week)) buckets.set(week, make(week));
    buckets.get(week)![p.difficulty]++;
  }
  return [...buckets.values()].sort((a, b) => a.week - b.week);
}

/* ------------------------------------------------------------------------- */
/* Spaced repetition                                                         */
/* ------------------------------------------------------------------------- */

export const REDO_OFFSETS = [1, 7, 30] as const;
export type RedoStageN = (typeof REDO_OFFSETS)[number];

export interface RedoStageInfo {
  stage: RedoStageN;
  dueDate: string;
  doneAt: string | null;
}

export interface RedoState {
  stages: RedoStageInfo[] | null;
  inQueue: boolean;
  nextStage: RedoStageN | null;
  dueDate: string | null;
  isDue: boolean;
  isOverdue: boolean;
  mastered: boolean;
}

export function stageDoneAt(p: ProblemLike, stage: RedoStageN): string | null {
  if (stage === 1) return p.redo1DoneAt ?? null;
  if (stage === 7) return p.redo7DoneAt ?? null;
  return p.redo30DoneAt ?? null;
}

export function computeRedoState(p: ProblemLike, today: string): RedoState {
  const mastered = REDO_OFFSETS.every((s) => !!stageDoneAt(p, s));
  if (!p.solvedAt) {
    return { stages: null, inQueue: false, nextStage: null, dueDate: null, isDue: false, isOverdue: false, mastered };
  }
  const stages = REDO_OFFSETS.map((stage) => ({
    stage,
    dueDate: addDays(p.solvedAt as string, stage),
    doneAt: stageDoneAt(p, stage),
  }));
  const next = stages.find((s) => !s.doneAt) ?? null;
  const inQueue = !!p.redoFlag && next !== null;
  const dueDate = next?.dueDate ?? null;
  return {
    stages,
    inQueue,
    nextStage: next?.stage ?? null,
    dueDate,
    isDue: inQueue && dueDate !== null && dueDate <= today,
    isOverdue: inQueue && dueDate !== null && dueDate < today,
    mastered,
  };
}

export interface RedoBuckets<T> {
  overdue: (T & { redo: RedoState })[];
  dueToday: (T & { redo: RedoState })[];
  upcoming: (T & { redo: RedoState })[];
}

export function bucketRedo<T extends ProblemLike>(
  problems: T[],
  today: string,
  upcomingDays = 7,
): RedoBuckets<T> {
  const out: RedoBuckets<T> = { overdue: [], dueToday: [], upcoming: [] };
  const horizon = addDays(today, upcomingDays);
  for (const p of problems) {
    const redo = computeRedoState(p, today);
    if (!redo.inQueue || !redo.dueDate) continue;
    const item = { ...p, redo };
    if (redo.isOverdue) out.overdue.push(item);
    else if (redo.isDue) out.dueToday.push(item);
    else if (redo.dueDate <= horizon) out.upcoming.push(item);
  }
  const byDue = (a: { redo: RedoState }, b: { redo: RedoState }) =>
    (a.redo.dueDate ?? "").localeCompare(b.redo.dueDate ?? "");
  out.overdue.sort(byDue);
  out.upcoming.sort(byDue);
  return out;
}

/* ------------------------------------------------------------------------- */
/* Streaks                                                                   */
/* ------------------------------------------------------------------------- */

export interface Streak {
  current: number;
  longest: number;
  /** true when today already has a counted event */
  activeToday: boolean;
}

/**
 * Current streak = consecutive dates with ≥1 counted event ending today; if today has
 * none yet, it counts up to yesterday ("keep it alive today"). Longest over all time.
 */
export function computeStreak(eventDates: Iterable<string>, today: string): Streak {
  const set = new Set(eventDates);
  const activeToday = set.has(today);

  let current = 0;
  let cursor = activeToday ? today : addDays(today, -1);
  while (set.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }

  const sorted = [...set].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev !== null && diffDays(d, prev) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  return { current, longest: Math.max(longest, current), activeToday };
}

/* ------------------------------------------------------------------------- */
/* Heatmap + solve style                                                     */
/* ------------------------------------------------------------------------- */

export interface HeatCell {
  date: string;
  count: number;
}

/** Full grid of dates from `from` to `to` with event counts (0 where none). */
export function computeHeatmap(counts: Map<string, number>, from: string, to: string): HeatCell[] {
  return dateRange(from, to).map((date) => ({ date, count: counts.get(date) ?? 0 }));
}

export function heatLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (max <= 1) return 4;
  const r = count / max;
  if (r <= 0.25) return 1;
  if (r <= 0.5) return 2;
  if (r <= 0.75) return 3;
  return 4;
}

export function computeHowBreakdown(problems: ProblemLike[]) {
  const out = { alone: 0, hint: 0, solution: 0, unknown: 0 };
  for (const p of problems) {
    if (!isDone(p)) continue;
    if (p.how) out[p.how]++;
    else out.unknown++;
  }
  return out;
}

export function computeAvgMinutes(problems: ProblemLike[]): Record<Difficulty, number | null> {
  const acc: Record<Difficulty, { sum: number; n: number }> = {
    easy: { sum: 0, n: 0 },
    medium: { sum: 0, n: 0 },
    hard: { sum: 0, n: 0 },
  };
  for (const p of problems) {
    if (!isDone(p) || !p.timeMinutes) continue;
    acc[p.difficulty].sum += p.timeMinutes;
    acc[p.difficulty].n++;
  }
  const avg = (d: Difficulty) => (acc[d].n ? Math.round(acc[d].sum / acc[d].n) : null);
  return { easy: avg("easy"), medium: avg("medium"), hard: avg("hard") };
}

/** Weakest topics: lowest % among topics whose end date has passed; else topics in progress. */
export function computeWeakSpots(stats: TopicStats[], today: string, n = 3) {
  const ended = stats.filter((s) => s.endDate !== null && s.endDate < today && s.target.total > 0);
  if (ended.length) {
    return { mode: "ended" as const, topics: [...ended].sort((a, b) => a.pct - b.pct).slice(0, n) };
  }
  const current = stats.filter(
    (s) => s.startDate !== null && s.startDate <= today && (s.endDate ?? "") >= today,
  );
  return { mode: "current" as const, topics: current.slice(0, n) };
}
