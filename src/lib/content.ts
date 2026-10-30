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

export const PLAN_DAYS = seed.meta.planDays;
export const TIMEZONE = seed.meta.timezone;
export const DEFAULT_START_DATE = seed.meta.defaultStartDate;
export const DEFAULT_DAILY_HOURS = seed.meta.defaultDailyHours;
