"use server";

import { and, eq, max } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { DIFFICULTIES, HOWS, STATUSES } from "@/lib/constants";
import { todayIST } from "@/lib/dates";
import { computeRedoState } from "@/lib/metrics";
import { applyProblemPatch, REDO_FIELD } from "@/lib/problem-logic";
import { ActionError, runAction, zDate, zOptText } from "@/server/action-utils";

const { problems, activityEvents } = schema;

const patchSchema = z
  .object({
    status: z.enum(STATUSES as [string, ...string[]]).optional(),
    solvedAt: zDate.nullable().optional(),
    how: z.enum(HOWS as [string, ...string[]]).nullable().optional(),
    timeMinutes: z.number().int().min(0).max(10_000).nullable().optional(),
    addMinutes: z.number().int().min(1).max(1_000).optional(),
    redoFlag: z.boolean().optional(),
    redo1DoneAt: zDate.nullable().optional(),
    redo7DoneAt: zDate.nullable().optional(),
    redo30DoneAt: zDate.nullable().optional(),
    notes: z.string().max(10_000).nullable().optional(),
    // plan fields (custom problems only)
    title: z.string().trim().min(1).max(200).optional(),
    url: z.string().trim().url().max(500).nullable().optional(),
    difficulty: z.enum(DIFFICULTIES as [string, ...string[]]).optional(),
    topicId: z.string().min(1).max(100).optional(),
    keyIdea: z.string().max(1000).nullable().optional(),
    lcNumber: z.number().int().positive().max(100_000).nullable().optional(),
  })
  .strict();

type Patch = z.infer<typeof patchSchema>;

const updateSchema = z.object({ id: z.number().int().positive(), patch: patchSchema });

async function loadProblem(id: number) {
  const [row] = await getDb().select().from(problems).where(eq(problems.id, id)).limit(1);
  if (!row) throw new ActionError("Problem not found");
  return row;
}

export async function updateProblem(input: { id: number; patch: Patch }) {
  return runAction(updateSchema, input, async ({ id, patch }) => {
    const db = getDb();
    const current = await loadProblem(id);
    const today = todayIST();

    const planKeys = ["title", "url", "difficulty", "topicId", "keyIdea", "lcNumber"] as const;
    if (!current.isCustom && planKeys.some((k) => patch[k] !== undefined)) {
      throw new ActionError("Plan fields can only be edited on custom problems");
    }

    const next = applyProblemPatch(current, patch as Parameters<typeof applyProblemPatch>[1], today);

    const update = db
      .update(problems)
      .set({
        status: next.status,
        solvedAt: next.solvedAt,
        how: next.how,
        timeMinutes: next.timeMinutes,
        redoFlag: next.redoFlag,
        redo1DoneAt: next.redo1DoneAt,
        redo7DoneAt: next.redo7DoneAt,
        redo30DoneAt: next.redo30DoneAt,
        notes: next.notes,
        title: next.title,
        url: next.url,
        difficulty: next.difficulty,
        topicId: next.topicId,
        keyIdea: next.keyIdea,
        lcNumber: next.lcNumber,
        updatedAt: new Date(),
      })
      .where(eq(problems.id, id));

    if (next.status !== current.status) {
      await db.batch([
        update,
        db.insert(activityEvents).values({
          eventDate: today,
          problemId: id,
          type: "status_change",
          fromStatus: current.status,
          toStatus: next.status,
        }),
      ]);
    } else {
      await update;
    }
    return { status: next.status, solvedAt: next.solvedAt, redoFlag: next.redoFlag };
  });
}

/** Completes the next due redo stage: stage date = today, status = revised, logs a redo_done event. */
export async function markRedoDone(input: { id: number }) {
  return runAction(z.object({ id: z.number().int().positive() }), input, async ({ id }) => {
    const db = getDb();
    const current = await loadProblem(id);
    const today = todayIST();
    const redo = computeRedoState(current, today);
    if (!redo.nextStage) throw new ActionError("No redo stage left for this problem");

    const stage = redo.nextStage;
    await db.batch([
      db
        .update(problems)
        .set({ [REDO_FIELD[stage]]: today, status: "revised", updatedAt: new Date() })
        .where(eq(problems.id, id)),
      db.insert(activityEvents).values({
        eventDate: today,
        problemId: id,
        type: "redo_done",
        fromStatus: current.status,
        toStatus: "revised",
        redoStage: stage,
      }),
    ]);
    return { stage };
  });
}

const createSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  topicId: z.string().min(1).max(100),
  difficulty: z.enum(DIFFICULTIES as [string, ...string[]]),
  lcNumber: z.number().int().positive().max(100_000).nullish(),
  url: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^https?:\/\//.test(v), "URL must start with http(s)://"),
  keyIdea: zOptText(1000),
});

export async function createCustomProblem(input: z.input<typeof createSchema>) {
  return runAction(createSchema, input, async (data) => {
    const db = getDb();
    if (data.lcNumber) {
      const [dupe] = await db
        .select({ id: problems.id })
        .from(problems)
        .where(eq(problems.lcNumber, data.lcNumber))
        .limit(1);
      if (dupe) throw new ActionError(`LC ${data.lcNumber} is already in your list`);
    }
    const [{ maxOrder }] = await db.select({ maxOrder: max(problems.order) }).from(problems);
    const [row] = await db
      .insert(problems)
      .values({
        title: data.title,
        topicId: data.topicId,
        difficulty: data.difficulty as "easy" | "medium" | "hard",
        lcNumber: data.lcNumber ?? null,
        url: data.url,
        keyIdea: data.keyIdea,
        isCustom: true,
        order: Math.max(1000, (maxOrder ?? 0) + 1),
      })
      .returning({ id: problems.id });
    return { id: row.id };
  });
}

export async function deleteCustomProblem(input: { id: number }) {
  return runAction(z.object({ id: z.number().int().positive() }), input, async ({ id }) => {
    const res = await getDb()
      .delete(problems)
      .where(and(eq(problems.id, id), eq(problems.isCustom, true)))
      .returning({ id: problems.id });
    if (!res.length) throw new ActionError("Only custom problems can be deleted");
  });
}
