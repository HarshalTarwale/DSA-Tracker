"use client";

import Link from "next/link";
import { useState } from "react";
import { ExternalLinkIcon, LightbulbIcon, PencilIcon } from "lucide-react";
import { computeRedoState } from "@/lib/metrics";
import type { ProblemPatch } from "@/lib/problem-logic";
import type { ProblemDTO } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useApp, useTopicName } from "@/components/app-context";
import { DifficultyBadge, MasteredBadge } from "@/components/shared/badges";
import { TimerButton } from "@/components/timer/timer-controls";
import { Button } from "@/components/ui/button";
import { HowSelect, RedoStar, TimeInput } from "./inline-controls";
import { StatusSegmented, StatusSelect } from "./status-control";

export interface ProblemRowOptions {
  showTopic?: boolean;
  /** "reveal" hides the key idea until clicked (think first) */
  keyIdea?: "reveal" | "shown" | "none";
  statusVariant?: "segmented" | "compact";
  showDetails?: boolean;
}

const INTERACTIVE = "a,button,input,select,textarea,label,[role=radio],[role=menuitem]";

export function ProblemRow({
  problem: p,
  onPatch,
  onOpen,
  options = {},
}: {
  problem: ProblemDTO;
  onPatch: (patch: ProblemPatch) => void;
  onOpen: () => void;
  options?: ProblemRowOptions;
}) {
  const { showTopic = false, keyIdea = "reveal", statusVariant = "segmented", showDetails = true } = options;
  const { today } = useApp();
  const topicName = useTopicName();
  const [revealed, setRevealed] = useState(false);
  const mastered = computeRedoState(p, today).mastered;
  const name = p.lcNumber ? `LC ${p.lcNumber} ${p.title}` : p.title;
  const StatusControl = statusVariant === "segmented" ? StatusSegmented : StatusSelect;

  return (
    <li
      className="group rounded-xl border border-border bg-card px-3 py-2.5 transition-colors duration-150 hover:bg-card-hover md:flex md:items-center md:gap-3"
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest(INTERACTIVE)) onOpen();
      }}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <span className="num mt-0.5 w-11 shrink-0 text-xs text-muted-foreground">
          {p.lcNumber ?? <span className="text-p3">custom</span>}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            {p.url ? (
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex min-w-0 items-center gap-1 text-sm font-medium hover:text-accent"
              >
                <span className="truncate">{p.title}</span>
                <ExternalLinkIcon className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
                <span className="sr-only">(opens LeetCode in a new tab)</span>
              </a>
            ) : (
              <span className="truncate text-sm font-medium">{p.title}</span>
            )}
            <DifficultyBadge difficulty={p.difficulty} />
            {mastered && <MasteredBadge />}
          </div>
          {(showTopic || keyIdea !== "none") && (
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {showTopic && (
                <Link href={`/topics/${p.topicId}`} className="truncate hover:text-foreground">
                  {topicName(p.topicId)}
                </Link>
              )}
              {keyIdea === "shown" && p.keyIdea && <span className="truncate">{p.keyIdea}</span>}
              {keyIdea === "reveal" &&
                p.keyIdea &&
                (revealed ? (
                  <button
                    type="button"
                    onClick={() => setRevealed(false)}
                    className="text-left text-foreground/80"
                    aria-label="Hide key idea"
                  >
                    <LightbulbIcon className="mr-1 inline size-3 text-medium" />
                    {p.keyIdea}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setRevealed(true)}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <LightbulbIcon className="size-3" /> Key idea
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 md:mt-0 md:flex-nowrap">
        <StatusControl
          value={p.status}
          onChange={(status) => onPatch({ status })}
          label={name}
          className={statusVariant === "segmented" ? "w-full sm:w-auto" : undefined}
        />
        {showDetails && (
          <>
            <HowSelect value={p.how} onChange={(how) => onPatch({ how })} label={name} />
            <TimeInput value={p.timeMinutes} onChange={(timeMinutes) => onPatch({ timeMinutes })} label={name} />
            <RedoStar value={p.redoFlag} onChange={(redoFlag) => onPatch({ redoFlag })} label={name} />
            <TimerButton problemId={p.id} title={p.title} />
          </>
        )}
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onOpen}
          aria-label={`Edit ${name}`}
          className={cn("ml-auto md:ml-0")}
          title="Edit all fields"
        >
          <PencilIcon className="text-muted-foreground" />
        </Button>
      </div>
    </li>
  );
}
