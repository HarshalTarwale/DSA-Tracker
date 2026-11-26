/** Pure progress math over auto-tracked solves. Unit-tested in tests/progress.test.ts. */
import { addDays, dateRange, diffDays } from "./dates";
import type { DiffTarget, Tier } from "./targets";

export type Difficulty = "easy" | "medium" | "hard";

export interface SolveLike {
  topicId: string | null;
  difficulty: Difficulty;
  solvedDate: string;
}

export interface Counts {
  easy: number;
  medium: number;
  hard: number;
  total: number;
}

export const emptyCounts = (): Counts => ({ easy: 0, medium: 0, hard: 0, total: 0 });

export function countSolves(solves: SolveLike[]): Counts {
  const c = emptyCounts();
  for (const s of solves) {
    c[s.difficulty]++;
    c.total++;
  }
  return c;
}

export type TopicStatus = "not-started" | "learning" | "almost" | "mastered";

export const TOPIC_STATUS_LABEL: Record<TopicStatus, string> = {
  "not-started": "Not started",
  learning: "Learning",
  almost: "Almost there",
  mastered: "Mastered",
};

export interface TopicProgress {
  topicId: string;
  solved: Counts;
  target: DiffTarget & { total: number };
  /** 0..1, weighted E×1 M×2 H×3, each difficulty capped at its target */
  score: number;
  status: TopicStatus;
  /** problems still needed per difficulty */
  need: DiffTarget;
}

export function topicScore(solved: DiffTarget, target: DiffTarget): number {
  const den = target.easy + 2 * target.medium + 3 * target.hard;
  if (den === 0) return 1;
  const num =
    Math.min(solved.easy, target.easy) + 2 * Math.min(solved.medium, target.medium) + 3 * Math.min(solved.hard, target.hard);
  return num / den;
}

export function topicProgress(topicId: string, solves: SolveLike[], target: DiffTarget): TopicProgress {
  const solved = countSolves(solves.filter((s) => s.topicId === topicId));
  const score = topicScore(solved, target);
  const need = {
    easy: Math.max(0, target.easy - solved.easy),
    medium: Math.max(0, target.medium - solved.medium),
    hard: Math.max(0, target.hard - solved.hard),
  };
  const mastered = need.easy + need.medium + need.hard === 0;
  const status: TopicStatus =
    solved.total === 0 ? "not-started" : mastered ? "mastered" : score >= 0.6 ? "almost" : "learning";
  return {
    topicId,
    solved,
    target: { ...target, total: target.easy + target.medium + target.hard },
    score,
    status,
    need,
  };
}

export interface TierTopic {
  id: string;
  importance: { tierA: number; tierB: number; tierC: number };
}

export interface TierReadiness {
  tier: Tier;
  /** 0..1 */
  readiness: number;
  ready: boolean;
  required: { topicId: string; importance: number; met: boolean; score: number }[];
}

/**
 * A tier is "ready" when every topic it cares about (importance ≥ minImportance)
 * reaches `bar` of its mastery score. Readiness weights topics by importance.
 */
export function tierReadiness(tier: Tier, topics: TierTopic[], progress: Map<string, TopicProgress>): TierReadiness {
  const key = `tier${tier.key}` as const;
  const required = topics
    .filter((t) => t.importance[key] >= tier.minImportance)
    .map((t) => {
      const score = progress.get(t.id)?.score ?? 0;
      return { topicId: t.id, importance: t.importance[key], met: score >= tier.bar, score };
    });
  const w = required.reduce((a, r) => a + r.importance, 0) || 1;
  const readiness = required.reduce((a, r) => a + r.importance * Math.min(1, r.score / tier.bar), 0) / w;
  return { tier, readiness, ready: required.every((r) => r.met), required };
}

export interface Pace {
  expected: number;
  actual: number;
  delta: number;
  tone: "before" | "ahead" | "on-track" | "behind" | "far-behind";
}

/** Compare solves since the plan started with the plan's cumulative targets (through yesterday). */
export function computePace(expectedByYesterday: number, solvedSinceStart: number, started: boolean): Pace {
  const delta = solvedSinceStart - expectedByYesterday;
  const tone: Pace["tone"] = !started
    ? "before"
    : delta > 0
      ? "ahead"
      : delta >= -2
        ? "on-track"
        : delta < -15
          ? "far-behind"
          : "behind";
  return { expected: expectedByYesterday, actual: solvedSinceStart, delta, tone };
}

export interface Streak {
  current: number;
  longest: number;
  activeToday: boolean;
}

/** Consecutive IST days with ≥1 solve, ending today (or yesterday if nothing yet today). */
export function computeStreak(dates: Iterable<string>, today: string): Streak {
  const set = new Set(dates);
  const activeToday = set.has(today);
  let current = 0;
  let cursor = activeToday ? today : addDays(today, -1);
  while (set.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of [...set].sort()) {
    run = prev !== null && diffDays(d, prev) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  return { current, longest: Math.max(longest, current), activeToday };
}

export interface HeatCell {
  date: string;
  count: number;
}

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

/** Pick what to focus on: topics whose block already ended but aren't mastered, weakest first. */
export function weakTopics(
  progress: TopicProgress[],
  blockEnd: Map<string, string>,
  today: string,
  n = 3,
): TopicProgress[] {
  return progress
    .filter((p) => (blockEnd.get(p.topicId) ?? "9999") < today && p.status !== "mastered")
    .sort((a, b) => a.score - b.score)
    .slice(0, n);
}
