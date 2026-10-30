import "server-only";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { DAY_STATUSES, DIFFICULTIES, HOWS, STATUSES } from "@/lib/constants";
import { isDateString } from "@/lib/dates";

const { problems, activityEvents, dayLogs, mistakes, mockTests, settings, topics } = schema;

export const BACKUP_APP = "dsa-tracker";
export const BACKUP_VERSION = 1;

/* --------------------------------- schema -------------------------------- */

const zDate = z.string().refine(isDateString, "invalid date");
const zEnum = <T extends string>(v: readonly T[]) => z.enum(v as unknown as [T, ...T[]]);

const backupProblem = z.object({
  id: z.number().int(),
  lcNumber: z.number().int().nullable(),
  isCustom: z.boolean(),
  order: z.number().int(),
  title: z.string().min(1).max(300),
  url: z.string().max(500).nullable(),
  difficulty: zEnum(DIFFICULTIES),
  topicId: z.string(),
  keyIdea: z.string().nullable(),
  status: zEnum(STATUSES),
  solvedAt: zDate.nullable(),
  how: zEnum(HOWS).nullable(),
  timeMinutes: z.number().int().min(0).nullable(),
  redoFlag: z.boolean(),
  redo1DoneAt: zDate.nullable(),
  redo7DoneAt: zDate.nullable(),
  redo30DoneAt: zDate.nullable(),
  notes: z.string().nullable(),
});

export const backupSchema = z.object({
  app: z.literal(BACKUP_APP),
  version: z.literal(BACKUP_VERSION),
  exportedAt: z.string(),
  settings: z.object({ startDate: zDate, dailyHours: z.number().int().min(1).max(16) }),
  problems: z.array(backupProblem).max(5000),
  dayLogs: z
    .array(
      z.object({
        dayIndex: z.number().int().min(0),
        status: zEnum(DAY_STATUSES).nullable(),
        hoursSpent: z.number().min(0).max(24).nullable(),
        notes: z.string().nullable(),
      }),
    )
    .max(2000),
  activityEvents: z
    .array(
      z.object({
        occurredAt: z.string(),
        eventDate: zDate,
        problemId: z.number().int(),
        type: zEnum(["status_change", "redo_done"] as const),
        fromStatus: zEnum(STATUSES).nullable(),
        toStatus: zEnum(STATUSES).nullable(),
        redoStage: z.number().int().nullable(),
      }),
    )
    .max(100_000),
  mistakes: z
    .array(
      z.object({
        date: zDate,
        problemId: z.number().int().nullable(),
        problemTitle: z.string().nullable(),
        topicId: z.string().nullable(),
        trigger: z.string().nullable(),
        whatWentWrong: z.string().nullable(),
        correctIdea: z.string().nullable(),
        resolved: z.boolean(),
      }),
    )
    .max(10_000),
  mockTests: z
    .array(
      z.object({
        date: zDate,
        title: z.string().min(1),
        attempted: z.number().int().min(0),
        solved: z.number().int().min(0),
        durationMinutes: z.number().int().min(0).nullable(),
        topicIds: z.array(z.string()),
        whatWentWrong: z.string().nullable(),
        notes: z.string().nullable(),
      }),
    )
    .max(5000),
});

export type Backup = z.infer<typeof backupSchema>;

/* --------------------------------- export -------------------------------- */

export async function buildBackup(): Promise<Backup> {
  const db = getDb();
  const [s, p, d, e, m, k] = await Promise.all([
    db.select().from(settings).where(eq(settings.id, 1)).limit(1),
    db.select().from(problems).orderBy(asc(problems.isCustom), asc(problems.order), asc(problems.id)),
    db.select().from(dayLogs).orderBy(asc(dayLogs.dayIndex)),
    db.select().from(activityEvents).orderBy(asc(activityEvents.id)),
    db.select().from(mistakes).orderBy(asc(mistakes.date), asc(mistakes.id)),
    db.select().from(mockTests).orderBy(asc(mockTests.date), asc(mockTests.id)),
  ]);

  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings: { startDate: s[0]?.startDate ?? "2026-11-05", dailyHours: s[0]?.dailyHours ?? 3 },
    problems: p.map((r) => ({
      id: r.id,
      lcNumber: r.lcNumber,
      isCustom: r.isCustom,
      order: r.order,
      title: r.title,
      url: r.url,
      difficulty: r.difficulty,
      topicId: r.topicId,
      keyIdea: r.keyIdea,
      status: r.status,
      solvedAt: r.solvedAt,
      how: r.how,
      timeMinutes: r.timeMinutes,
      redoFlag: r.redoFlag,
      redo1DoneAt: r.redo1DoneAt,
      redo7DoneAt: r.redo7DoneAt,
      redo30DoneAt: r.redo30DoneAt,
      notes: r.notes,
    })),
    dayLogs: d.map((r) => ({
      dayIndex: r.dayIndex,
      status: r.status,
      hoursSpent: r.hoursSpent,
      notes: r.notes,
    })),
    activityEvents: e.map((r) => ({
      occurredAt: r.occurredAt.toISOString(),
      eventDate: r.eventDate,
      problemId: r.problemId,
      type: r.type,
      fromStatus: r.fromStatus,
      toStatus: r.toStatus,
      redoStage: r.redoStage,
    })),
    mistakes: m.map((r) => ({
      date: r.date,
      problemId: r.problemId,
      problemTitle: r.problemTitle,
      topicId: r.topicId,
      trigger: r.trigger,
      whatWentWrong: r.whatWentWrong,
      correctIdea: r.correctIdea,
      resolved: r.resolved,
    })),
    mockTests: k.map((r) => ({
      date: r.date,
      title: r.title,
      attempted: r.attempted,
      solved: r.solved,
      durationMinutes: r.durationMinutes,
      topicIds: r.topicIds,
      whatWentWrong: r.whatWentWrong,
      notes: r.notes,
    })),
  };
}

/* ------------------------------ reset/import ----------------------------- */

const clearedUserFields = {
  status: "not_started" as const,
  solvedAt: null,
  how: null,
  timeMinutes: null,
  redoFlag: false,
  redo1DoneAt: null,
  redo7DoneAt: null,
  redo30DoneAt: null,
  notes: null,
};

function resetStatements() {
  const db = getDb();
  return [
    db.delete(activityEvents),
    db.delete(dayLogs),
    db.delete(mistakes),
    db.delete(mockTests),
    db.update(problems).set({ ...clearedUserFields, updatedAt: new Date() }),
  ] as const;
}

/** Clears user fields, events, logs, mistakes and mocks. Plan data and custom problems stay. */
export async function resetProgress(): Promise<void> {
  const db = getDb();
  await db.batch([...resetStatements()]);
}

export function summarizeBackup(b: Backup) {
  return {
    exportedAt: b.exportedAt,
    startDate: b.settings.startDate,
    problems: b.problems.length,
    custom: b.problems.filter((p) => p.isCustom).length,
    withProgress: b.problems.filter((p) => p.status !== "not_started").length,
    solved: b.problems.filter((p) => p.status === "solved" || p.status === "revised").length,
    dayLogs: b.dayLogs.length,
    events: b.activityEvents.length,
    mistakes: b.mistakes.length,
    mocks: b.mockTests.length,
  };
}

/**
 * Restores progress from a backup. Planned problems are matched by LC number; custom
 * problems by id (if still custom), then LC number, else they are re-created.
 * Everything after re-creating missing custom problems runs in one atomic batch.
 */
export async function restoreBackup(b: Backup): Promise<{ restored: number; skipped: number }> {
  const db = getDb();
  const [existing, topicRows] = await Promise.all([
    db.select({ id: problems.id, lcNumber: problems.lcNumber, isCustom: problems.isCustom }).from(problems),
    db.select({ id: topics.id }).from(topics),
  ]);
  const topicIds = new Set(topicRows.map((t) => t.id));
  const byLc = new Map(existing.filter((r) => r.lcNumber !== null).map((r) => [r.lcNumber as number, r.id]));
  const customIds = new Set(existing.filter((r) => r.isCustom).map((r) => r.id));

  // old backup id -> current db id
  const idMap = new Map<number, number>();
  const toCreate: Backup["problems"] = [];
  let skipped = 0;

  for (const p of b.problems) {
    if (p.isCustom && customIds.has(p.id)) idMap.set(p.id, p.id);
    else if (p.lcNumber !== null && byLc.has(p.lcNumber)) idMap.set(p.id, byLc.get(p.lcNumber)!);
    else if (p.isCustom && topicIds.has(p.topicId)) toCreate.push(p);
    else skipped++;
  }

  if (toCreate.length) {
    const created = await db
      .insert(problems)
      .values(
        toCreate.map((p) => ({
          lcNumber: p.lcNumber,
          order: p.order,
          title: p.title,
          url: p.url,
          difficulty: p.difficulty,
          topicId: p.topicId,
          keyIdea: p.keyIdea,
          isCustom: true,
        })),
      )
      .returning({ id: problems.id });
    toCreate.forEach((p, i) => idMap.set(p.id, created[i].id));
  }

  const updates = b.problems
    .filter((p) => idMap.has(p.id))
    .map((p) =>
      db
        .update(problems)
        .set({
          status: p.status,
          solvedAt: p.solvedAt,
          how: p.how,
          timeMinutes: p.timeMinutes,
          redoFlag: p.redoFlag,
          redo1DoneAt: p.redo1DoneAt,
          redo7DoneAt: p.redo7DoneAt,
          redo30DoneAt: p.redo30DoneAt,
          notes: p.notes,
          updatedAt: new Date(),
        })
        .where(eq(problems.id, idMap.get(p.id)!)),
    );

  const events = b.activityEvents
    .filter((e) => idMap.has(e.problemId))
    .map((e) => ({
      occurredAt: new Date(e.occurredAt),
      eventDate: e.eventDate,
      problemId: idMap.get(e.problemId)!,
      type: e.type,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      redoStage: e.redoStage,
    }));

  const mistakeRows = b.mistakes.map((m) => ({
    ...m,
    problemId: m.problemId !== null ? (idMap.get(m.problemId) ?? null) : null,
    topicId: m.topicId && topicIds.has(m.topicId) ? m.topicId : null,
  }));

  const chunks = <T,>(arr: T[], n = 500) =>
    Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

  const statements = [
    ...resetStatements(),
    db
      .insert(settings)
      .values({ id: 1, ...b.settings })
      .onConflictDoUpdate({ target: settings.id, set: { ...b.settings, updatedAt: new Date() } }),
    ...updates,
    ...chunks(b.dayLogs).map((c) => db.insert(dayLogs).values(c)),
    ...chunks(events).map((c) => db.insert(activityEvents).values(c)),
    ...chunks(mistakeRows).map((c) => db.insert(mistakes).values(c)),
    ...chunks(b.mockTests).map((c) => db.insert(mockTests).values(c)),
  ];

  // drizzle's batch needs a non-empty tuple type
  await db.batch(statements as unknown as [(typeof statements)[number], ...(typeof statements)[number][]]);
  return { restored: updates.length, skipped };
}
