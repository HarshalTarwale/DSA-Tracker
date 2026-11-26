/** Serializable shapes passed from Server Components to Client Components. */
import type { Difficulty, Source } from "@/db/schema";

export interface SolveDTO {
  id: number;
  source: Source;
  slug: string;
  title: string;
  url: string | null;
  lcNumber: number | null;
  difficulty: Difficulty;
  topicId: string | null;
  topicLocked: boolean;
  solvedDate: string;
}

/** Minimal topic info for client pickers/labels. */
export interface TopicOption {
  id: string;
  name: string;
  order: number;
}

export type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string };
