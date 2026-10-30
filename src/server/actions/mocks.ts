"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { ActionError, runAction, zDate, zOptText } from "@/server/action-utils";

const { mockTests } = schema;

const mockSchema = z
  .object({
    date: zDate,
    title: z.string().trim().min(1, "Title is required").max(200),
    attempted: z.number().int().min(0).max(100),
    solved: z.number().int().min(0).max(100),
    durationMinutes: z.number().int().min(0).max(1440).nullable(),
    topicIds: z.array(z.string().min(1).max(100)).max(30),
    whatWentWrong: zOptText(5000),
    notes: zOptText(5000),
  })
  .refine((m) => m.solved <= m.attempted, {
    message: "Solved can't be more than attempted",
    path: ["solved"],
  });

export type MockInput = z.input<typeof mockSchema>;

export async function createMock(input: MockInput) {
  return runAction(mockSchema, input, async (data) => {
    const [row] = await getDb().insert(mockTests).values(data).returning({ id: mockTests.id });
    return { id: row.id };
  });
}

export async function updateMock(input: { id: number; data: MockInput }) {
  return runAction(
    z.object({ id: z.number().int().positive(), data: mockSchema }),
    input,
    async ({ id, data }) => {
      const res = await getDb()
        .update(mockTests)
        .set(data)
        .where(eq(mockTests.id, id))
        .returning({ id: mockTests.id });
      if (!res.length) throw new ActionError("Mock not found");
    },
  );
}

export async function deleteMock(input: { id: number }) {
  return runAction(z.object({ id: z.number().int().positive() }), input, async ({ id }) => {
    await getDb().delete(mockTests).where(eq(mockTests.id, id));
  });
}
