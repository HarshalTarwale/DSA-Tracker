/**
 * Problem-update automations (Section 4.1), shared by the server action and the
 * client's optimistic update so both always agree.
 */
import type { Difficulty, How, Status } from "./metrics";
import { isDone } from "./metrics";

export interface ProblemUserFields {
  status: Status;
  solvedAt: string | null;
  how: How | null;
  timeMinutes: number | null;
  redoFlag: boolean;
  redo1DoneAt: string | null;
  redo7DoneAt: string | null;
  redo30DoneAt: string | null;
  notes: string | null;
}

export interface ProblemPlanFields {
  title: string;
  url: string | null;
  difficulty: Difficulty;
  topicId: string;
  keyIdea: string | null;
  lcNumber: number | null;
}

export type ProblemPatch = Partial<ProblemUserFields> &
  Partial<ProblemPlanFields> & {
    /** add minutes to timeMinutes (timer) */
    addMinutes?: number;
  };

export function applyProblemPatch<T extends ProblemUserFields>(
  current: T,
  patch: ProblemPatch,
  today: string,
): T {
  const { addMinutes, ...rest } = patch;
  const next = { ...current } as T;
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined) (next as Record<string, unknown>)[k] = v;
  }

  if (addMinutes && addMinutes > 0) {
    next.timeMinutes = (current.timeMinutes ?? 0) + Math.round(addMinutes);
  }

  const statusChanged = patch.status !== undefined && patch.status !== current.status;

  if (statusChanged && patch.status === "not_started") {
    next.solvedAt = null;
    next.how = null;
    next.timeMinutes = null;
    next.redo1DoneAt = null;
    next.redo7DoneAt = null;
    next.redo30DoneAt = null;
  } else if (statusChanged && isDone(next) && !next.solvedAt) {
    next.solvedAt = today;
  }

  if (
    patch.how !== undefined &&
    patch.how !== current.how &&
    (patch.how === "hint" || patch.how === "solution") &&
    patch.redoFlag === undefined
  ) {
    next.redoFlag = true;
  }

  return next;
}

/** Stage keys on the problem row. */
export const REDO_FIELD = {
  1: "redo1DoneAt",
  7: "redo7DoneAt",
  30: "redo30DoneAt",
} as const;
