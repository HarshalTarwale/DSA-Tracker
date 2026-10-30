"use client";

import Link from "next/link";
import { CheckIcon, RotateCcwIcon } from "lucide-react";
import { formatDate, relativeDay } from "@/lib/dates";
import { stageDoneAt, type RedoStageN } from "@/lib/metrics";
import type { ProblemDTO } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useApp, useTopicName } from "@/components/app-context";
import { DifficultyBadge } from "@/components/shared/badges";
import { Button } from "@/components/ui/button";
import { useProblemMutations } from "@/components/problems/use-problem-mutations";

export interface RedoItem {
  problem: ProblemDTO;
  stage: RedoStageN;
  dueDate: string;
}

export function RedoList({
  items,
  showButton = true,
  compact = false,
}: {
  items: RedoItem[];
  showButton?: boolean;
  compact?: boolean;
}) {
  const { today } = useApp();
  const topicName = useTopicName();
  const m = useProblemMutations(items.map((i) => i.problem));
  const byId = new Map(m.problems.map((p) => [p.id, p]));

  return (
    <>
      <ul className="flex flex-col gap-2">
        {items.map(({ problem, stage, dueDate }) => {
          const p = byId.get(problem.id) ?? problem;
          const done = !!stageDoneAt(p, stage);
          const late = dueDate < today;
          return (
            <li
              key={`${p.id}-${stage}`}
              className={cn(
                "flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 transition-opacity duration-200",
                done && "opacity-60",
                compact && "py-2",
              )}
            >
              <span
                className={cn(
                  "num flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                  done ? "bg-status-revised/15 text-status-revised" : late ? "bg-hard/15 text-hard" : "bg-card-hover text-muted-foreground",
                )}
                title={`Redo stage +${stage}`}
              >
                {done ? <CheckIcon className="size-4" /> : `+${stage}`}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="num text-xs text-muted-foreground">{p.lcNumber ?? "custom"}</span>
                  {p.url ? (
                    <a href={p.url} target="_blank" rel="noreferrer noopener" className="truncate text-sm font-medium hover:text-accent">
                      {p.title}
                    </a>
                  ) : (
                    <span className="truncate text-sm font-medium">{p.title}</span>
                  )}
                  <DifficultyBadge difficulty={p.difficulty} short />
                </div>
                <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  <span className={cn(late && !done && "text-hard")}>
                    Due {formatDate(dueDate, "d MMM")} · {relativeDay(dueDate, today)}
                  </span>
                  {!compact && (
                    <Link href={`/topics/${p.topicId}`} className="truncate hover:text-foreground">
                      {topicName(p.topicId)}
                    </Link>
                  )}
                </div>
              </div>
              {showButton && (
                <Button
                  size="sm"
                  variant={done ? "ghost" : "secondary"}
                  disabled={done}
                  onClick={() => m.redoDone(p)}
                  aria-label={`Mark redo +${stage} done for ${p.title}`}
                >
                  {done ? <CheckIcon /> : <RotateCcwIcon />}
                  <span className="hidden sm:inline">{done ? "Done" : "Redo done"}</span>
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {m.dialog}
    </>
  );
}
