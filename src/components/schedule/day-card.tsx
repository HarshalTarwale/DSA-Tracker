import Link from "next/link";
import { DIFFICULTY_LABEL, STATUS_LABEL } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { isDone } from "@/lib/metrics";
import type { DayLogDTO, ProblemDTO, ScheduleDayDTO } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DayTypeBadge } from "@/components/shared/badges";
import { DayStatusToggle } from "./day-log-control";

const DIFF_BORDER = { easy: "border-easy/60", medium: "border-medium/60", hard: "border-hard/60" } as const;
const DIFF_TEXT = { easy: "text-easy", medium: "text-medium", hard: "text-hard" } as const;

export function ProblemChip({ p }: { p: ProblemDTO }) {
  const done = isDone(p);
  const cls = cn(
    "num inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium transition-colors",
    DIFF_BORDER[p.difficulty],
    done
      ? p.status === "revised"
        ? "bg-status-revised/20 text-status-revised"
        : "bg-status-solved/20 text-status-solved"
      : p.status === "attempted"
        ? "bg-status-attempted/15 text-status-attempted"
        : DIFF_TEXT[p.difficulty],
  );
  const title = `LC ${p.lcNumber} ${p.title} · ${DIFFICULTY_LABEL[p.difficulty]} · ${STATUS_LABEL[p.status]}`;
  const content = (
    <>
      {done && <span aria-hidden>✓</span>}
      {p.lcNumber ?? "•"}
    </>
  );
  return p.url ? (
    <a href={p.url} target="_blank" rel="noreferrer noopener" className={cn(cls, "hover:brightness-125")} title={title}>
      {content}
      <span className="sr-only">{title}</span>
    </a>
  ) : (
    <span className={cls} title={title}>
      {content}
    </span>
  );
}

export function DayCard({
  day,
  date,
  isToday,
  isPast,
  log,
  problems,
  topicName,
}: {
  day: ScheduleDayDTO;
  date: string;
  isToday: boolean;
  isPast: boolean;
  log: DayLogDTO | undefined;
  problems: ProblemDTO[];
  topicName: string | null;
}) {
  const special = day.type !== "study";
  const label = `Day ${day.dayIndex + 1}`;
  return (
    <article
      id={isToday ? "today" : `day-${day.dayIndex}`}
      aria-current={isToday ? "date" : undefined}
      className={cn(
        "flex flex-col gap-2 rounded-xl border bg-card p-3 transition-colors",
        isToday ? "border-accent ring-1 ring-accent/40" : "border-border",
        day.type === "review" && "border-l-2 border-l-p3",
        day.type === "mock" && "border-l-2 border-l-hard",
        day.type === "final" && "border-l-2 border-l-accent",
      )}
    >
      <header className="flex flex-wrap items-center gap-2">
        <span className="num text-sm font-medium">{formatDate(date, "EEE d MMM")}</span>
        <span className="num text-xs text-muted-foreground">{label}</span>
        <DayTypeBadge type={day.type} />
        {isToday && <span className="rounded-md bg-accent px-1.5 py-0.5 text-[11px] font-medium text-accent-foreground">Today</span>}
        <div className="ml-auto">
          <DayStatusToggle dayIndex={day.dayIndex} log={log} label={label} />
        </div>
      </header>
      <div className="flex flex-col gap-1">
        {day.topicId ? (
          <Link href={`/topics/${day.topicId}`} className="text-sm font-medium hover:text-accent">
            {topicName ?? day.title}
          </Link>
        ) : (
          <span className={cn("text-sm font-medium", special && "text-foreground")}>{day.title}</span>
        )}
        <p className="text-xs leading-relaxed text-muted-foreground">{day.focus}</p>
      </div>
      {problems.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {problems.map((p) => (
            <ProblemChip key={p.id} p={p} />
          ))}
        </div>
      )}
      {(isPast && !log?.status) || log?.hoursSpent != null || log?.notes ? (
        <footer className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          {isPast && !log?.status && <span className="italic opacity-70">not logged</span>}
          {log?.hoursSpent != null && <span className="num">{log.hoursSpent}h</span>}
          {log?.notes && <span className="truncate">{log.notes}</span>}
        </footer>
      ) : null}
    </article>
  );
}
