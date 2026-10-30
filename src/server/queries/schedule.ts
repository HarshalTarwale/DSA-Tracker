import "server-only";
import { cache } from "react";
import { asc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { DayLogDTO, ScheduleDayDTO } from "@/lib/types";

const { scheduleDays, scheduleDayProblems, dayLogs } = schema;

/** All 112 days with their problem ids in position order. Two queries, joined in memory. */
export const getSchedule = cache(async (): Promise<ScheduleDayDTO[]> => {
  const db = getDb();
  const [days, links] = await Promise.all([
    db.select().from(scheduleDays).orderBy(asc(scheduleDays.dayIndex)),
    db
      .select()
      .from(scheduleDayProblems)
      .orderBy(asc(scheduleDayProblems.dayIndex), asc(scheduleDayProblems.position)),
  ]);
  const byDay = new Map<number, number[]>();
  for (const l of links) {
    const list = byDay.get(l.dayIndex) ?? [];
    list.push(l.problemId);
    byDay.set(l.dayIndex, list);
  }
  return days.map((d) => ({ ...d, problemIds: byDay.get(d.dayIndex) ?? [] }));
});

export const getDayLogs = cache(async (): Promise<Map<number, DayLogDTO>> => {
  const rows = await getDb()
    .select({
      dayIndex: dayLogs.dayIndex,
      status: dayLogs.status,
      hoursSpent: dayLogs.hoursSpent,
      notes: dayLogs.notes,
    })
    .from(dayLogs);
  return new Map(rows.map((r) => [r.dayIndex, r]));
});
