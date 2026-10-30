import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { DEFAULT_DAILY_HOURS, DEFAULT_START_DATE, PLAN_DAYS } from "@/lib/content";
import { getTodayIndex, planEndDate, todayIST, weekOf } from "@/lib/dates";

export interface AppSettings {
  startDate: string;
  dailyHours: number;
}

export const getSettings = cache(async (): Promise<AppSettings> => {
  const rows = await getDb()
    .select({ startDate: schema.settings.startDate, dailyHours: schema.settings.dailyHours })
    .from(schema.settings)
    .where(eq(schema.settings.id, 1))
    .limit(1);
  return rows[0] ?? { startDate: DEFAULT_START_DATE, dailyHours: DEFAULT_DAILY_HOURS };
});

export interface PlanClock {
  today: string;
  startDate: string;
  endDate: string;
  todayIndex: number;
  /** 1..112 while the plan runs */
  dayNumber: number | null;
  week: number | null;
  phase: "before" | "during" | "after";
  dailyHours: number;
}

export const getPlanClock = cache(async (): Promise<PlanClock> => {
  const s = await getSettings();
  const today = todayIST();
  const todayIndex = getTodayIndex(s.startDate, today);
  const phase = todayIndex < 0 ? "before" : todayIndex >= PLAN_DAYS ? "after" : "during";
  return {
    today,
    startDate: s.startDate,
    endDate: planEndDate(s.startDate, PLAN_DAYS),
    todayIndex,
    dayNumber: phase === "during" ? todayIndex + 1 : null,
    week: phase === "during" ? weekOf(todayIndex) : null,
    phase,
    dailyHours: s.dailyHours,
  };
});
