"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { topicById } from "@/lib/content";
import { DIFFICULTIES } from "@/lib/constants";
import { ActionError, runAction, zDate } from "@/server/action-utils";

const zTopic = z.string().refine((id) => topicById.has(id), "unknown topic");

/** Change the topic a solve counts toward. Locks it so sync never changes it back. */
export async function setSolveTopic(input: { id: number; topicId: string | null }) {
  return runAction(z.object({ id: z.number().int().positive(), topicId: zTopic.nullable() }), input, async ({ id, topicId }) => {
    const res = await getDb()
      .update(schema.solves)
      .set({ topicId, topicLocked: true })
      .where(eq(schema.solves.id, id))
      .returning({ id: schema.solves.id });
    if (!res.length) throw new ActionError("Solve not found");
  });
}

const manualSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  url: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^https?:\/\//.test(v), "Link must start with http(s)://"),
  difficulty: z.enum(DIFFICULTIES as ["easy", "medium", "hard"]),
  topicId: zTopic,
  date: zDate,
});

/** For problems from other sites (GFG, a YouTube video…). LeetCode/HackerRank solves sync by themselves. */
export async function addManualSolve(input: z.input<typeof manualSchema>) {
  return runAction(manualSchema, input, async (d) => {
    const slug = `manual-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    await getDb().insert(schema.solves).values({
      source: "manual",
      slug,
      title: d.title,
      url: d.url,
      difficulty: d.difficulty,
      topicId: d.topicId,
      topicLocked: true,
      solvedAt: new Date(`${d.date}T12:00:00+05:30`),
      solvedDate: d.date,
    });
  });
}

/** Only manual entries can be deleted; synced ones would come straight back. */
export async function deleteManualSolve(input: { id: number }) {
  return runAction(z.object({ id: z.number().int().positive() }), input, async ({ id }) => {
    const res = await getDb()
      .delete(schema.solves)
      .where(and(eq(schema.solves.id, id), eq(schema.solves.source, "manual")))
      .returning({ id: schema.solves.id });
    if (!res.length) throw new ActionError("Only manually added solves can be deleted");
  });
}
