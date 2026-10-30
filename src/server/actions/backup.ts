"use server";

import { z } from "zod";
import { ActionError, runAction } from "@/server/action-utils";
import { backupSchema, resetProgress, restoreBackup, summarizeBackup } from "@/server/backup";

const MAX_BYTES = 8 * 1024 * 1024;

function parseBackup(text: string) {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ActionError("That file is not valid JSON");
  }
  const parsed = backupSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ActionError(
      `Not a DSA Tracker backup (${issue ? `${issue.path.join(".")}: ${issue.message}` : "invalid shape"})`,
    );
  }
  return parsed.data;
}

const textSchema = z.object({ text: z.string().min(2).max(MAX_BYTES) });

/** Validates a backup and returns counts for the confirmation preview. Writes nothing. */
export async function previewBackup(input: { text: string }) {
  return runAction(textSchema, input, async ({ text }) => summarizeBackup(parseBackup(text)));
}

export async function importBackup(input: { text: string }) {
  return runAction(textSchema, input, async ({ text }) => restoreBackup(parseBackup(text)));
}

export async function resetAllProgress(input: { confirm: string }) {
  return runAction(z.object({ confirm: z.literal("RESET") }), input, async () => {
    await resetProgress();
  });
}
