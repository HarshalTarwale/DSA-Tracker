import "server-only";
import { cache } from "react";
import { asc, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { PlatformTotals } from "@/db/schema";
import {
  curatedProblems,
  DEFAULT_END_DATE,
  DEFAULT_PRACTICE_END_DATE,
  DEFAULT_START_DATE,
  topics,
} from "@/lib/content";
import { diffDays, todayIST } from "@/lib/dates";
import { buildPlan, topicBlocks, type PlanDay } from "@/lib/plan";
import { topicProgress, type TopicProgress } from "@/lib/progress";
import { TOPIC_TARGETS, targetFor } from "@/lib/targets";
import type { SolveDTO } from "@/lib/types";

export interface AppSettings {
  startDate: string;
  endDate: string;
  practiceEndDate: string;
  leetcodeUsername: string | null;
  hackerrankUsername: string | null;
  lastSyncedAt: Date | null;
  lastSyncError: string | null;
  leetcodeTotals: PlatformTotals | null;
}

export const DEFAULT_SETTINGS: AppSettings = {
  startDate: DEFAULT_START_DATE,
  endDate: DEFAULT_END_DATE,
  practiceEndDate: DEFAULT_PRACTICE_END_DATE,
  leetcodeUsername: null,
  hackerrankUsername: null,
  lastSyncedAt: null,
  lastSyncError: null,
  leetcodeTotals: null,
};

/** Uncached read (use inside writes/sync, where the per-request cache could be stale). */
export async function loadSettings(): Promise<AppSettings> {
  const s = schema.settings;
  const [row] = await getDb()
    .select({
      startDate: s.startDate,
      endDate: s.endDate,
      practiceEndDate: s.practiceEndDate,
      leetcodeUsername: s.leetcodeUsername,
      hackerrankUsername: s.hackerrankUsername,
      lastSyncedAt: s.lastSyncedAt,
      lastSyncError: s.lastSyncError,
      leetcodeTotals: s.leetcodeTotals,
    })
    .from(s)
    .where(eq(s.id, 1))
    .limit(1);
  return row ?? DEFAULT_SETTINGS;
}

export const getSettings = cache(loadSettings);

export const getSolves = cache(async (): Promise<SolveDTO[]> => {
  const v = schema.solves;
  return getDb()
    .select({
      id: v.id,
      source: v.source,
      slug: v.slug,
      title: v.title,
      url: v.url,
      lcNumber: v.lcNumber,
      difficulty: v.difficulty,
      topicId: v.topicId,
      topicLocked: v.topicLocked,
      solvedDate: v.solvedDate,
    })
    .from(v)
    .orderBy(desc(v.solvedAt), asc(v.id));
});

export type Phase = "before" | "plan" | "practice" | "after";

export interface AppData {
  settings: AppSettings;
  solves: SolveDTO[];
  today: string;
  phase: Phase;
  plan: PlanDay[];
  todayDay: PlanDay | null;
  /** 1-based day number in the main plan (null outside it) */
  dayNumber: number | null;
  planDays: number;
  progress: TopicProgress[];
  progressById: Map<string, TopicProgress>;
  blockEnd: Map<string, string>;
  /** curated slugs you have solved (from any LeetCode solve) */
  solvedSlugs: Set<string>;
}

/** Everything most pages need, computed once per request. */
export const getAppData = cache(async (): Promise<AppData> => {
  const [settings, solves] = await Promise.all([getSettings(), getSolves()]);
  const today = todayIST();
  const plan = buildPlan(settings.startDate, settings.endDate, topics, TOPIC_TARGETS, curatedProblems);
  const phase: Phase =
    today < settings.startDate
      ? "before"
      : today <= settings.endDate
        ? "plan"
        : today <= settings.practiceEndDate
          ? "practice"
          : "after";
  const todayDay = plan.find((d) => d.date === today) ?? null;
  const progress = topics.map((t) => topicProgress(t.id, solves, targetFor(t.id)));
  return {
    settings,
    solves,
    today,
    phase,
    plan,
    todayDay,
    dayNumber: phase === "plan" ? diffDays(today, settings.startDate) + 1 : null,
    planDays: plan.length,
    progress,
    progressById: new Map(progress.map((p) => [p.topicId, p])),
    blockEnd: new Map(topicBlocks(plan).map((b) => [b.topicId, b.end])),
    solvedSlugs: new Set(solves.filter((s) => s.source === "leetcode").map((s) => s.slug)),
  };
});
