"use server";

import { z } from "zod";
import { getDb, schema } from "@/db";
import { DAY_STATUSES } from "@/lib/constants";
import { runAction, zOptText } from "@/server/action-utils";

const dayLogSchema = z.object({
  dayIndex: z.number().int().min(0).max(1000),
  status: z.enum(DAY_STATUSES as [string, ...string[]]).nullable().optional(),
  hoursSpent: z.number().min(0).max(24).nullable().optional(),
  notes: zOptText(5000).optional(),
});

/** Upserts a day log; only fields present in the input are written. */
export async function saveDayLog(input: z.input<typeof dayLogSchema>) {
  return runAction(dayLogSchema, input, async ({ dayIndex, ...rest }) => {
    const set: Partial<typeof schema.dayLogs.$inferInsert> = { updatedAt: new Date() };
    if (rest.status !== undefined) set.status = rest.status as "yes" | "partial" | "skipped" | null;
    if (rest.hoursSpent !== undefined) set.hoursSpent = rest.hoursSpent === null ? null : Math.round(rest.hoursSpent * 10) / 10;
    if (input.notes !== undefined) set.notes = rest.notes ?? null;

    await getDb()
      .insert(schema.dayLogs)
      .values({ dayIndex, ...set })
      .onConflictDoUpdate({ target: schema.dayLogs.dayIndex, set });
  });
}
