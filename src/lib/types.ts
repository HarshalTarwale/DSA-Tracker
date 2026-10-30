/** Serializable shapes passed from Server Components to Client Components. */
import type { DayStatus, DayType, Difficulty, How, Priority, Status } from "@/db/schema";

export interface ProblemDTO {
  id: number;
  lcNumber: number | null;
  order: number;
  title: string;
  url: string | null;
  difficulty: Difficulty;
  topicId: string;
  keyIdea: string | null;
  isCustom: boolean;
  status: Status;
  solvedAt: string | null;
  how: How | null;
  timeMinutes: number | null;
  redoFlag: boolean;
  redo1DoneAt: string | null;
  redo7DoneAt: string | null;
  redo30DoneAt: string | null;
  notes: string | null;
  /** scheduled plan day (null for custom problems) */
  dayIndex: number | null;
}

export interface TopicDTO {
  id: string;
  order: number;
  name: string;
  priority: Priority;
  phase: string;
  plannedDays: number;
  importanceA: number;
  importanceB: number;
  importanceC: number;
  dailyFocus: string[];
}

/** Minimal topic info for client pickers/labels. */
export interface TopicOption {
  id: string;
  name: string;
  order: number;
}

export interface ScheduleDayDTO {
  dayIndex: number;
  type: DayType;
  phase: string;
  topicId: string | null;
  title: string;
  focus: string;
  problemIds: number[];
}

export interface DayLogDTO {
  dayIndex: number;
  status: DayStatus | null;
  hoursSpent: number | null;
  notes: string | null;
}

export type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string };
