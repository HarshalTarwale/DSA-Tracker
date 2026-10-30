"use server";

import { z } from "zod";
import { getDb, schema } from "@/db";
import { runAction, zDate } from "@/server/action-utils";

const settingsSchema = z.object({
  startDate: zDate,
  dailyHours: z.number().int().min(1).max(16),
});

export async function updateSettings(input: z.input<typeof settingsSchema>) {
  return runAction(settingsSchema, input, async (data) => {
    await getDb()
      .insert(schema.settings)
      .values({ id: 1, ...data })
      .onConflictDoUpdate({
        target: schema.settings.id,
        set: { ...data, updatedAt: new Date() },
      });
  });
}
