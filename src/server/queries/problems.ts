import "server-only";
import { cache } from "react";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { ProblemDTO } from "@/lib/types";

const { problems, scheduleDayProblems } = schema;

/** Every problem (planned + custom) with the dayIndex it is scheduled on. One query. */
export const getProblems = cache(async (): Promise<ProblemDTO[]> => {
  const rows = await getDb()
    .select({
      id: problems.id,
      lcNumber: problems.lcNumber,
      order: problems.order,
      title: problems.title,
      url: problems.url,
      difficulty: problems.difficulty,
      topicId: problems.topicId,
      keyIdea: problems.keyIdea,
      isCustom: problems.isCustom,
      status: problems.status,
      solvedAt: problems.solvedAt,
      how: problems.how,
      timeMinutes: problems.timeMinutes,
      redoFlag: problems.redoFlag,
      redo1DoneAt: problems.redo1DoneAt,
      redo7DoneAt: problems.redo7DoneAt,
      redo30DoneAt: problems.redo30DoneAt,
      notes: problems.notes,
      dayIndex: scheduleDayProblems.dayIndex,
    })
    .from(problems)
    .leftJoin(scheduleDayProblems, eq(scheduleDayProblems.problemId, problems.id))
    .orderBy(asc(problems.isCustom), asc(problems.order), asc(problems.id));
  return rows;
});
