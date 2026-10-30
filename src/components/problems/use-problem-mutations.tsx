"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { markRedoDone, updateProblem } from "@/server/actions/problems";
import { HOW_LABEL, STATUS_LABEL } from "@/lib/constants";
import { computeRedoState } from "@/lib/metrics";
import { applyProblemPatch, REDO_FIELD, type ProblemPatch } from "@/lib/problem-logic";
import type { ProblemDTO } from "@/lib/types";
import { useApp } from "@/components/app-context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type OptimisticAction =
  | { kind: "patch"; id: number; patch: ProblemPatch }
  | { kind: "redo"; id: number };

function label(p: ProblemDTO) {
  return p.lcNumber ? `LC ${p.lcNumber}` : p.title;
}

function describe(p: ProblemDTO, patch: ProblemPatch, next: ProblemDTO): string {
  if (patch.status && patch.status !== p.status) return `${STATUS_LABEL[next.status]} · ${label(p)}`;
  if (patch.how !== undefined && patch.how !== p.how) {
    const how = next.how ? HOW_LABEL[next.how] : "cleared";
    return next.redoFlag && !p.redoFlag ? `How: ${how} · starred for redo` : `How: ${how}`;
  }
  if (patch.redoFlag !== undefined) return patch.redoFlag ? `Starred for redo · ${label(p)}` : `Unstarred · ${label(p)}`;
  if (patch.timeMinutes !== undefined) return `Time saved · ${label(p)}`;
  return `Saved · ${label(p)}`;
}

/**
 * Optimistic problem updates for any list. Status/How/redo automations run on the
 * client (same pure function as the server) so the UI is instant; on failure the
 * optimistic state is dropped (rollback) and an error toast is shown.
 */
export function useProblemMutations(problems: ProblemDTO[]) {
  const { today } = useApp();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<{ p: ProblemDTO; patch: ProblemPatch } | null>(null);

  const [optimistic, apply] = useOptimistic(problems, (state: ProblemDTO[], action: OptimisticAction) =>
    state.map((p) => {
      if (p.id !== action.id) return p;
      if (action.kind === "patch") return applyProblemPatch(p, action.patch, today);
      const stage = computeRedoState(p, today).nextStage;
      return stage ? { ...p, [REDO_FIELD[stage]]: today, status: "revised" as const } : p;
    }),
  );

  function commit(p: ProblemDTO, patch: ProblemPatch) {
    const next = applyProblemPatch(p, patch, today);
    startTransition(async () => {
      apply({ kind: "patch", id: p.id, patch });
      const res = await updateProblem({ id: p.id, patch: patch as Parameters<typeof updateProblem>[0]["patch"] });
      if (res.ok) toast.success(describe(p, patch, next));
      else toast.error(res.error);
    });
  }

  /** Use for every user edit; asks for confirmation before resetting to Not started. */
  function update(p: ProblemDTO, patch: ProblemPatch) {
    if (patch.status === "not_started" && p.status !== "not_started") {
      setConfirm({ p, patch });
      return;
    }
    commit(p, patch);
  }

  function redoDone(p: ProblemDTO) {
    startTransition(async () => {
      apply({ kind: "redo", id: p.id });
      const res = await markRedoDone({ id: p.id });
      if (res.ok) toast.success(`Redo +${res.data.stage} done · ${label(p)} → Revised`);
      else toast.error(res.error);
    });
  }

  const dialog = (
    <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset to Not started?</AlertDialogTitle>
          <AlertDialogDescription>
            This clears the date solved, how, time and all redo dates for “{confirm?.p.title}”. Notes are kept.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              if (confirm) commit(confirm.p, confirm.patch);
              setConfirm(null);
            }}
          >
            Reset
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { problems: optimistic, update, redoDone, pending, dialog };
}

export type ProblemMutations = ReturnType<typeof useProblemMutations>;
