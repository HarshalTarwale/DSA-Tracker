import "server-only";
import { bucketRedo, isDone, type RedoState } from "@/lib/metrics";
import type { ProblemDTO } from "@/lib/types";
import type { RedoItem } from "@/components/revision/redo-list";

function toItem(p: ProblemDTO & { redo: RedoState }): RedoItem {
  const { redo, ...problem } = p;
  return { problem, stage: redo.nextStage!, dueDate: redo.dueDate! };
}

export function redoView(problems: ProblemDTO[], today: string) {
  const b = bucketRedo(problems, today);
  return {
    overdue: b.overdue.map(toItem),
    dueToday: b.dueToday.map(toItem),
    upcoming: b.upcoming.map(toItem),
  };
}

/** Problems with status attempted, oldest first (by plan day, then solved/updated order). */
export function attemptedBacklog(problems: ProblemDTO[]): ProblemDTO[] {
  return problems
    .filter((p) => p.status === "attempted")
    .sort((a, b) => (a.dayIndex ?? 9999) - (b.dayIndex ?? 9999) || a.order - b.order);
}

/** Planned problems from earlier study days that are not done yet. */
export function carryOver(problems: ProblemDTO[], todayIndex: number): ProblemDTO[] {
  return problems.filter((p) => !p.isCustom && p.dayIndex !== null && p.dayIndex < todayIndex && !isDone(p));
}
