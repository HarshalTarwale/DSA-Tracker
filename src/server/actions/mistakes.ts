"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { ActionError, runAction, zDate, zOptText } from "@/server/action-utils";

const { mistakes } = schema;

const mistakeSchema = z
  .object({
    date: zDate,
    problemId: z.number().int().positive().nullable(),
    problemTitle: zOptText(300),
    topicId: z.string().min(1).max(100).nullable(),
    trigger: zOptText(1000),
    whatWentWrong: zOptText(5000),
    correctIdea: zOptText(2000),
    resolved: z.boolean(),
  })
  .refine((m) => m.problemId !== null || !!m.problemTitle, {
    message: "Pick a problem or type its name",
    path: ["problemTitle"],
  });

export type MistakeInput = z.input<typeof mistakeSchema>;

export async function createMistake(input: MistakeInput) {
  return runAction(mistakeSchema, input, async (data) => {
    const [row] = await getDb().insert(mistakes).values(data).returning({ id: mistakes.id });
    return { id: row.id };
  });
}

export async function updateMistake(input: { id: number; data: MistakeInput }) {
  return runAction(
    z.object({ id: z.number().int().positive(), data: mistakeSchema }),
    input,
    async ({ id, data }) => {
      const res = await getDb()
        .update(mistakes)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(mistakes.id, id))
        .returning({ id: mistakes.id });
      if (!res.length) throw new ActionError("Entry not found");
    },
  );
}

export async function toggleMistakeResolved(input: { id: number; resolved: boolean }) {
  return runAction(
    z.object({ id: z.number().int().positive(), resolved: z.boolean() }),
    input,
    async ({ id, resolved }) => {
      await getDb().update(mistakes).set({ resolved, updatedAt: new Date() }).where(eq(mistakes.id, id));
    },
  );
}

export async function deleteMistake(input: { id: number }) {
  return runAction(z.object({ id: z.number().int().positive() }), input, async ({ id }) => {
    await getDb().delete(mistakes).where(eq(mistakes.id, id));
  });
}
