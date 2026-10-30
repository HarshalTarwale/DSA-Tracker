import type { DayType, Difficulty, Priority, Status } from "@/db/schema";
import {
  DAY_TYPE_CLASS,
  DAY_TYPE_LABEL,
  DIFFICULTY_CLASS,
  DIFFICULTY_LABEL,
  PRIORITY_CLASS,
  STATUS_CLASS,
  STATUS_LABEL,
} from "@/lib/constants";
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

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const c = STATUS_CLASS[status];
  return (
    <span className={cn(base, c.bg, c.text, className)}>
      <span className={cn("size-1.5 rounded-full", c.dot)} aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return <span className={cn(base, "num", PRIORITY_CLASS[priority], className)}>{priority}</span>;
}

export function DayTypeBadge({ type, className }: { type: DayType; className?: string }) {
  return <span className={cn(base, DAY_TYPE_CLASS[type], className)}>{DAY_TYPE_LABEL[type]}</span>;
}

export function MasteredBadge({ className }: { className?: string }) {
  return (
    <span className={cn(base, "bg-status-revised/15 text-status-revised", className)} title="All three redos done">
      ★ Mastered
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
          <span
            key={i}
            className={cn("size-1.5 rounded-full", i <= value ? "bg-accent" : "bg-border")}
          />
        ))}
      </span>
    </span>
  );
}
