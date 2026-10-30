"use client";

import { useState } from "react";
import type { ProblemDTO } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EditSheet } from "./edit-sheet";
import { ProblemRow, type ProblemRowOptions } from "./problem-row";
import { useProblemMutations } from "./use-problem-mutations";

/**
 * A list of problem rows with optimistic inline editing and the edit side-sheet.
 * Pass `filter` to show a subset while keeping optimistic state over the full set
 * (so a row doesn't vanish mid-edit when a filter no longer matches).
 */
export function ProblemList({
  problems,
  options,
  className,
  empty,
  visibleIds,
}: {
  problems: ProblemDTO[];
  options?: ProblemRowOptions;
  className?: string;
  empty?: React.ReactNode;
  /** if given, only these ids are rendered (in this order) */
  visibleIds?: number[];
}) {
  const m = useProblemMutations(problems);
  const [openId, setOpenId] = useState<number | null>(null);
  const byId = new Map(m.problems.map((p) => [p.id, p]));
  const rows = visibleIds ? visibleIds.map((id) => byId.get(id)).filter((p): p is ProblemDTO => !!p) : m.problems;
  const open = openId !== null ? (byId.get(openId) ?? null) : null;

  return (
    <>
      {rows.length === 0 && empty ? (
        empty
      ) : (
        <ul className={cn("flex flex-col gap-2", className)}>
          {rows.map((p) => (
            <ProblemRow
              key={p.id}
              problem={p}
              options={options}
              onPatch={(patch) => m.update(p, patch)}
              onOpen={() => setOpenId(p.id)}
            />
          ))}
        </ul>
      )}
      <EditSheet
        problem={open}
        open={openId !== null}
        onOpenChange={(o) => !o && setOpenId(null)}
        onSave={(p, patch) => m.update(p, patch)}
        onRedoDone={(p) => m.redoDone(p)}
      />
      {m.dialog}
    </>
  );
}
