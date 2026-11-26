import type { Difficulty, Priority, Source } from "@/db/schema";
import {
  DIFFICULTY_CLASS,
  DIFFICULTY_LABEL,
  PRIORITY_CLASS,
  SOURCE_CLASS,
  SOURCE_LABEL,
  STEP_CLASS,
  STEP_LABEL,
  TOPIC_STATUS_CLASS,
} from "@/lib/constants";
import type { Step } from "@/lib/plan";
import { TOPIC_STATUS_LABEL, type TopicStatus } from "@/lib/progress";
import { cn } from "@/lib/utils";

const base = "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap";

export function DifficultyBadge({
  difficulty,
  short = false,
  className,
}: {
  difficulty: Difficulty;
  short?: boolean;
  className?: string;
}) {
  const c = DIFFICULTY_CLASS[difficulty];
  return (
    <span className={cn(base, c.bg, c.text, className)} title={DIFFICULTY_LABEL[difficulty]}>
      {short ? DIFFICULTY_LABEL[difficulty][0] : DIFFICULTY_LABEL[difficulty]}
    </span>
  );
}

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return <span className={cn(base, "num", PRIORITY_CLASS[priority], className)}>{priority}</span>;
}

export function SourceBadge({ source, className }: { source: Source; className?: string }) {
  return <span className={cn(base, SOURCE_CLASS[source], className)}>{SOURCE_LABEL[source]}</span>;
}

export function StepBadge({ step, className }: { step: Step; className?: string }) {
  return <span className={cn(base, STEP_CLASS[step], className)}>{STEP_LABEL[step]}</span>;
}

export function TopicStatusBadge({ status, className }: { status: TopicStatus; className?: string }) {
  const c = TOPIC_STATUS_CLASS[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", c.text, className)}>
      <span className={cn("size-1.5 rounded-full", c.bar)} aria-hidden />
      {TOPIC_STATUS_LABEL[status]}
    </span>
  );
}

/** 0–3 importance dots for a company tier. */
export function ImportanceDots({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1" title={`${label}: ${value}/3`}>
      <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
      <span className="inline-flex gap-0.5" aria-label={`${label} importance ${value} of 3`}>
        {[1, 2, 3].map((i) => (
          <span key={i} className={cn("size-1.5 rounded-full", i <= value ? "bg-accent" : "bg-border")} />
        ))}
      </span>
    </span>
  );
}
