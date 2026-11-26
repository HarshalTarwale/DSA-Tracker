"use server";

import { z } from "zod";
import { getDb, schema } from "@/db";
import { ActionError, runAction, zDate } from "@/server/action-utils";
import { loadSettings } from "@/server/data";
import { syncAll } from "@/server/sync";

async function saveSettings(patch: Partial<typeof schema.settings.$inferInsert>) {
  const cur = await loadSettings();
  const values = {
    id: 1,
    startDate: cur.startDate,
    endDate: cur.endDate,
    practiceEndDate: cur.practiceEndDate,
    ...patch,
    updatedAt: new Date(),
  };
  await getDb()
    .insert(schema.settings)
    .values(values)
    .onConflictDoUpdate({ target: schema.settings.id, set: { ...patch, updatedAt: new Date() } });
}

const datesSchema = z
  .object({ startDate: zDate, endDate: zDate, practiceEndDate: zDate })
  .refine((d) => d.endDate > d.startDate, { message: "End date must be after the start date", path: ["endDate"] })
  .refine((d) => d.practiceEndDate >= d.endDate, {
    message: "Practice phase must end on or after the plan end date",
    path: ["practiceEndDate"],
  });

export async function updatePlanDates(input: z.input<typeof datesSchema>) {
  return runAction(datesSchema, input, async (d) => saveSettings(d));
}

const username = z
  .string()
  .trim()
  .max(60)
  .regex(/^[A-Za-z0-9_.-]*$/, "Usernames can only contain letters, numbers, _ . -")
  .transform((v) => v || null);

const accountsSchema = z.object({ leetcodeUsername: username, hackerrankUsername: username });

/** Saves usernames and immediately runs a sync so you see the result. */
export async function updateAccounts(input: z.input<typeof accountsSchema>) {
  return runAction(accountsSchema, input, async (d) => {
    await saveSettings({ ...d, lastSyncedAt: null, lastSyncError: null, leetcodeTotals: null });
    if (!d.leetcodeUsername && !d.hackerrankUsername) return null;
    return syncAll();
  });
}

/** Deletes every tracked solve and sync state. Plan dates and usernames stay. */
export async function resetProgress(input: { confirm: string }) {
  return runAction(z.object({ confirm: z.string() }), input, async ({ confirm }) => {
    if (confirm !== "RESET") throw new ActionError('Type "RESET" to confirm');
    await getDb().delete(schema.solves);
    await saveSettings({ lastSyncedAt: null, lastSyncError: null, leetcodeTotals: null });
  });
}
