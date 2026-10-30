import "server-only";
import { asc, desc } from "drizzle-orm";
import { getDb, schema } from "@/db";

export interface MistakeDTO {
  id: number;
  date: string;
  problemId: number | null;
  problemTitle: string | null;
  topicId: string | null;
  trigger: string | null;
  whatWentWrong: string | null;
  correctIdea: string | null;
  resolved: boolean;
}

export interface MockDTO {
  id: number;
  date: string;
  title: string;
  attempted: number;
  solved: number;
  durationMinutes: number | null;
  topicIds: string[];
  whatWentWrong: string | null;
  notes: string | null;
}

export async function getMistakes(): Promise<MistakeDTO[]> {
  const m = schema.mistakes;
  return getDb()
    .select({
      id: m.id,
      date: m.date,
      problemId: m.problemId,
      problemTitle: m.problemTitle,
      topicId: m.topicId,
      trigger: m.trigger,
      whatWentWrong: m.whatWentWrong,
      correctIdea: m.correctIdea,
      resolved: m.resolved,
    })
    .from(m)
    .orderBy(desc(m.date), desc(m.id));
}

export async function getMocks(): Promise<MockDTO[]> {
  const t = schema.mockTests;
  return getDb()
    .select({
      id: t.id,
      date: t.date,
      title: t.title,
      attempted: t.attempted,
      solved: t.solved,
      durationMinutes: t.durationMinutes,
      topicIds: t.topicIds,
      whatWentWrong: t.whatWentWrong,
      notes: t.notes,
    })
    .from(t)
    .orderBy(asc(t.date), asc(t.id));
}
