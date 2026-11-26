"use server";

import { z } from "zod";
import { runAction } from "@/server/action-utils";
import { getSettings } from "@/server/data";
import { isStale, syncAll, type SyncResult } from "@/server/sync";

/** "Sync now" button. */
export async function syncNow() {
  return runAction(z.object({}).optional(), undefined, () => syncAll());
}

/** Called on page load; only syncs if the last sync is older than 10 minutes. */
export async function syncIfStale() {
  return runAction(z.object({}).optional(), undefined, async (): Promise<SyncResult | null> => {
    const s = await getSettings();
    if (!s.leetcodeUsername && !s.hackerrankUsername) return null;
    if (!isStale(s.lastSyncedAt)) return null;
    return syncAll();
  });
}
