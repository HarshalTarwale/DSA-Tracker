/**
 * Typed access to the plan seed (data/seed-data.json).
 * Static reference content (tiers, rules, triggers…) is read from here at runtime;
 * plan data (topics, problems, schedule) is seeded into the DB by scripts/seed.ts.
 *
 * Import this only from server code, the seed script and tests — never from a
 * client component (it would ship the whole JSON to the browser).
 */
import raw from "../../data/seed-data.json";

export type SeedDifficulty = "Easy" | "Medium" | "Hard";
export type SeedPriority = "P1" | "P2" | "P3";
export type SeedDayType = "study" | "review" | "mock" | "final";

export interface SeedTopic {
  id: string;
  order: number;
  name: string;
  priority: SeedPriority;
  phase: string;
  plannedDays: number;
  importance: { tierA: number; tierB: number; tierC: number };
  dailyFocus: string[];
}

export interface SeedProblem {
  lcNumber: number;
  order: number;
  title: string;
  difficulty: SeedDifficulty;
  topicId: string;
  keyIdea: string;
  url: string;
}

export interface SeedScheduleDay {
  dayIndex: number;
  type: SeedDayType;
  phase: string;
  topicId: string | null;
  title: string;
  focus: string;
  problemIds: number[];
}

export interface CompanyTier {
  tier: string;
  examples: string;
  round: string;
  topics: string;
  difficulty: string;
  volume: string;
}

export interface CompanyFavorite {
  company: string;
  topics: string;
  examples: string;
}

export interface SeedData {
  meta: {
    version: number;
    defaultStartDate: string;
    defaultDailyHours: number;
    planDays: number;
    timezone: string;
    reviewRule: string;
    mockDayIndexes: number[];
    redoOffsetsDays: number[];
    counts: { topics: number; problems: number; easy: number; medium: number; hard: number };
    notes: string;
  };
  topics: SeedTopic[];
  problems: SeedProblem[];
  schedule: SeedScheduleDay[];
  companyTiers: CompanyTier[];
  companyFavorites: CompanyFavorite[];
  sources: { title: string; url: string }[];
  statusMeaning: Record<"Not started" | "Attempted" | "Solved" | "Revised", string>;
  rules: { title: string; text: string }[];
  patternTriggers: { trigger: string; pattern: string }[];
}

export const seed = raw as SeedData;

export const meta = seed.meta;
export const companyTiers = seed.companyTiers;
export const companyFavorites = seed.companyFavorites;
export const sources = seed.sources;
export const statusMeaning = seed.statusMeaning;
export const rules = seed.rules;
export const patternTriggers = seed.patternTriggers;

export const TIMEZONE = seed.meta.timezone;

/** Main plan: 1 Dec 2026 → 1 Apr 2027, then a practice phase to 30 Jun 2027. */
export const DEFAULT_START_DATE = "2026-12-01";
export const DEFAULT_END_DATE = "2027-04-01";
export const DEFAULT_PRACTICE_END_DATE = "2027-06-30";

export const topics = [...seed.topics].sort((a, b) => a.order - b.order);
export const topicById = new Map(topics.map((t) => [t.id, t]));

export interface CuratedProblem {
  lcNumber: number;
  slug: string;
  title: string;
  url: string;
  difficulty: "easy" | "medium" | "hard";
  topicId: string;
  keyIdea: string;
  order: number;
  /** 0-based study day within its topic in the original plan */
  topicDay: number;
}

export function slugFromUrl(url: string): string {
  const m = url.match(/leetcode\.com\/problems\/([^/?#]+)/);
  return m ? m[1] : url;
}

function buildCurated(): CuratedProblem[] {
  const dayOfLc = new Map<number, number>();
  const seen = new Map<string, number>();
  for (const d of seed.schedule) {
    if (d.type !== "study" || !d.topicId) continue;
    const k = seen.get(d.topicId) ?? 0;
    for (const lc of d.problemIds) dayOfLc.set(lc, k);
    seen.set(d.topicId, k + 1);
  }
  return [...seed.problems]
    .sort((a, b) => a.order - b.order)
    .map((p) => ({
      lcNumber: p.lcNumber,
      slug: slugFromUrl(p.url),
      title: p.title,
      url: p.url,
      difficulty: p.difficulty.toLowerCase() as CuratedProblem["difficulty"],
      topicId: p.topicId,
      keyIdea: p.keyIdea,
      order: p.order,
      topicDay: dayOfLc.get(p.lcNumber) ?? 0,
    }));
}

export const curatedProblems = buildCurated();
export const curatedBySlug = new Map(curatedProblems.map((p) => [p.slug, p]));
