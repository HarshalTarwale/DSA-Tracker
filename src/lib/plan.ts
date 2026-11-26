/**
 * Builds the day-by-day plan from the start/end dates. Pure and deterministic, so
 * changing the dates in Settings reshapes the whole plan.
 *
 *  - Sundays are weekly review days (LeetCode weekly contest is Sunday 8:00 IST).
 *  - The last FINAL_DAYS days are revision + timed mocks.
 *  - Every other day is a study day. Topics get study days in proportion to their
 *    weight in the original plan; each topic's Easy → Medium → Hard target is spread
 *    across its days, and its first day is "learn" (video + video problems).
 */
import type { CuratedProblem } from "./content";
import { addDays, diffDays } from "./dates";
import type { DiffTarget } from "./targets";

export const FINAL_DAYS = 7;

export type DayKind = "study" | "review" | "final";
export type Step = "learn" | "practice" | "deepen" | "review" | "final";

export interface PlanTopic {
  id: string;
  name: string;
  plannedDays: number;
  dailyFocus: string[];
}

export interface PlanDay {
  index: number;
  date: string;
  /** 1-based week; weeks run Monday → Sunday */
  week: number;
  kind: DayKind;
  step: Step;
  topicId: string | null;
  /** 0-based day within the topic block, and the block length */
  topicDay: number;
  topicDays: number;
  focus: string;
  target: DiffTarget;
  /** curated LeetCode slugs suggested for this day */
  suggested: string[];
}

const ZERO: DiffTarget = { easy: 0, medium: 0, hard: 0 };

/** 0 = Sunday … 6 = Saturday, from a YYYY-MM-DD string (timezone-free). */
export function weekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Monday of the week containing `date`. */
export function mondayOf(date: string): string {
  return addDays(date, -((weekday(date) + 6) % 7));
}

export function weekNumber(start: string, date: string): number {
  return Math.floor(diffDays(mondayOf(date), mondayOf(start)) / 7) + 1;
}

/** Split `total` slots across weights (largest remainder), at least 1 each when possible. */
export function allocate(total: number, weights: number[]): number[] {
  const n = weights.length;
  if (total <= 0 || n === 0) return weights.map(() => 0);
  const min = total >= n ? 1 : 0;
  const rest = total - min * n;
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map((w) => (w / sum) * rest);
  const out = raw.map((r) => Math.floor(r) + min);
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0; left > 0; k = (k + 1) % n, left--) out[order[k][1]]++;
  return out;
}

/** Spread a topic's E→M→H target over `days` days, easiest first. */
export function spreadTarget(target: DiffTarget, days: number): DiffTarget[] {
  if (days <= 0) return [];
  const items: (keyof DiffTarget)[] = [
    ...Array<"easy">(target.easy).fill("easy"),
    ...Array<"medium">(target.medium).fill("medium"),
    ...Array<"hard">(target.hard).fill("hard"),
  ];
  const n = items.length;
  return Array.from({ length: days }, (_, i) => {
    const chunk = items.slice(Math.floor((i * n) / days), Math.floor(((i + 1) * n) / days));
    return {
      easy: chunk.filter((x) => x === "easy").length,
      medium: chunk.filter((x) => x === "medium").length,
      hard: chunk.filter((x) => x === "hard").length,
    };
  });
}

const REVIEW_FOCUS =
  "Weekly review: do the LeetCode weekly contest (Sunday 8:00 AM IST), then re-solve this week's problems that needed AI help, without help.";
const FINAL_FOCUS = [
  "Timed mock: 3 unseen problems (Easy, Medium, Medium/Hard) in 90 minutes, no hints. Then review every miss.",
  "Revise your two weakest topics: re-solve 3 problems from each from scratch.",
];

export function buildPlan(
  start: string,
  end: string,
  topics: PlanTopic[],
  targets: Record<string, DiffTarget>,
  curated: CuratedProblem[],
): PlanDay[] {
  const total = diffDays(end, start) + 1;
  if (total <= 0) return [];

  const kinds: DayKind[] = Array.from({ length: total }, (_, i) => {
    if (i >= total - Math.min(FINAL_DAYS, Math.floor(total / 4))) return "final";
    return weekday(addDays(start, i)) === 0 ? "review" : "study";
  });
  const studySlots = kinds.filter((k) => k === "study").length;
  const daysPerTopic = allocate(studySlots, topics.map((t) => Math.max(1, t.plannedDays)));

  // Study-day assignments in topic order.
  type Assign = { topic: PlanTopic; topicDay: number; topicDays: number; target: DiffTarget; suggested: string[] };
  const assigns: Assign[] = [];
  topics.forEach((topic, ti) => {
    const d = daysPerTopic[ti];
    if (d === 0) return;
    const spread = spreadTarget(targets[topic.id] ?? ZERO, d);
    const seedDays = Math.max(1, topic.plannedDays);
    const byDay: string[][] = Array.from({ length: d }, () => []);
    for (const p of curated) {
      if (p.topicId !== topic.id) continue;
      const k = d >= seedDays ? p.topicDay : Math.floor((p.topicDay * d) / seedDays);
      byDay[Math.min(d - 1, k)].push(p.slug);
    }
    for (let k = 0; k < d; k++) {
      assigns.push({ topic, topicDay: k, topicDays: d, target: spread[k], suggested: byDay[k] });
    }
  });

  let next = 0;
  let finalN = 0;
  return kinds.map((kind, index) => {
    const date = addDays(start, index);
    const week = weekNumber(start, date);
    if (kind === "review") {
      return { index, date, week, kind, step: "review", topicId: null, topicDay: 0, topicDays: 0, focus: REVIEW_FOCUS, target: { easy: 0, medium: 2, hard: 0 }, suggested: [] };
    }
    if (kind === "final") {
      const focus = FINAL_FOCUS[finalN++ % FINAL_FOCUS.length];
      return { index, date, week, kind, step: "final", topicId: null, topicDay: 0, topicDays: 0, focus, target: { easy: 0, medium: 2, hard: 1 }, suggested: [] };
    }
    const a = assigns[next++];
    const last = a.topicDay === a.topicDays - 1 && a.topicDays > 1;
    const step: Step = a.topicDay === 0 ? "learn" : last ? "deepen" : "practice";
    const focus =
      a.topic.dailyFocus[a.topicDay] ??
      (last
        ? `Hardest ${a.topic.name} problems + recap the patterns in your own words.`
        : `Practice day: more ${a.topic.name} problems from the LeetCode tag list. 30 minutes alone before any hint.`);
    return {
      index,
      date,
      week,
      kind,
      step,
      topicId: a.topic.id,
      topicDay: a.topicDay,
      topicDays: a.topicDays,
      focus,
      target: a.target,
      suggested: a.suggested,
    };
  });
}

export function dayTotal(t: DiffTarget): number {
  return t.easy + t.medium + t.hard;
}

/** Sum of daily targets for plan days with date ≤ `date`. */
export function expectedThrough(plan: PlanDay[], date: string): number {
  let n = 0;
  for (const d of plan) if (d.date <= date) n += dayTotal(d.target);
  return n;
}

export interface TopicBlock {
  topicId: string;
  start: string;
  end: string;
  days: number;
}

/** Each topic's first/last study date (blocks are contiguous apart from Sundays). */
export function topicBlocks(plan: PlanDay[]): TopicBlock[] {
  const map = new Map<string, TopicBlock>();
  for (const d of plan) {
    if (!d.topicId) continue;
    const b = map.get(d.topicId);
    if (b) {
      b.end = d.date;
      b.days++;
    } else map.set(d.topicId, { topicId: d.topicId, start: d.date, end: d.date, days: 1 });
  }
  return [...map.values()];
}
