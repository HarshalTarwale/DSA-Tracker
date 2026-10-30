import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarClockIcon,
  ChevronDownIcon,
  FlagIcon,
  PartyPopperIcon,
  RotateCcwIcon,
  TargetIcon,
  TimerIcon,
} from "lucide-react";
import { PLAN_DAYS } from "@/lib/content";
import { dayIndexToDate, formatDate, weekOf } from "@/lib/dates";
import { computeTopicStats, computeWeakSpots, isDone } from "@/lib/metrics";
import type { ProblemDTO, ScheduleDayDTO } from "@/lib/types";
import { getProblems } from "@/server/queries/problems";
import { getDayLogs, getSchedule } from "@/server/queries/schedule";
import { getPlanClock } from "@/server/queries/settings";
import { getTopics } from "@/server/queries/topics";
import { attemptedBacklog, carryOver, redoView } from "@/server/views";
import { DayTypeBadge } from "@/components/shared/badges";
import { EmptyState, Section } from "@/components/shared/page";
import { Bar } from "@/components/shared/progress";
import { ProblemList } from "@/components/problems/problem-list";
import { RedoList, type RedoItem } from "@/components/revision/redo-list";
import { DayLogCard } from "@/components/schedule/day-log-control";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Today" };
export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const [clock, schedule, problems, logs, topics] = await Promise.all([
    getPlanClock(),
    getSchedule(),
    getProblems(),
    getDayLogs(),
    getTopics(),
  ]);
  const redo = redoView(problems, clock.today);
  const redoDue = [...redo.overdue, ...redo.dueToday];

  if (clock.phase === "before") {
    const day1 = schedule[0];
    return (
      <div className="flex flex-col gap-6">
        <Header title="Plan hasn’t started yet" subtitle={formatDate(clock.today, "EEEE, d MMMM yyyy")} />
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-6 py-10 text-center">
          <CalendarClockIcon className="size-6 text-accent" />
          <p className="num text-5xl font-semibold">{-clock.todayIndex}</p>
          <p className="text-muted-foreground">
            {-clock.todayIndex === 1 ? "day" : "days"} until Day 1 · {formatDate(clock.startDate, "EEE d MMM")}
          </p>
        </div>
        {day1 && <DayPreview day={day1} problems={problems} title="Preview: Day 1" />}
        {redoDue.length > 0 && <RedoSection items={redoDue} />}
      </div>
    );
  }

  if (clock.phase === "after") {
    const stats = computeTopicStats(topics, problems, schedule, clock.startDate);
    const weak = computeWeakSpots(stats, clock.today).topics;
    const names = new Map(topics.map((t) => [t.id, t.name]));
    return (
      <div className="flex flex-col gap-6">
        <Header title="Plan complete" subtitle={formatDate(clock.today, "EEEE, d MMMM yyyy")} />
        <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
          <PartyPopperIcon className="mt-0.5 size-5 shrink-0 text-accent" />
          <div className="text-sm">
            <p className="font-medium">All 112 days are behind you.</p>
            <p className="mt-1 text-muted-foreground">
              Keep the edge: do the LeetCode weekly contest every Sunday, clear your redo queue, and revisit your weakest
              topics below.
            </p>
          </div>
        </div>
        <RedoSection items={redoDue} />
        <Section title="Weakest topics">
          <ul className="grid gap-2 sm:grid-cols-3">
            {weak.map((s) => (
              <li key={s.topicId}>
                <Link href={`/topics/${s.topicId}`} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 hover:bg-card-hover">
                  <span className="text-sm font-medium">{names.get(s.topicId)}</span>
                  <Bar value={s.pct} />
                  <span className="num text-xs text-muted-foreground">
                    {s.solved.total}/{s.target.total} · {Math.round(s.pct * 100)}%
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
        <AttemptedSection problems={attemptedBacklog(problems)} />
      </div>
    );
  }

  const day = schedule[clock.todayIndex];
  const date = dayIndexToDate(clock.startDate, clock.todayIndex);
  const log = logs.get(clock.todayIndex);
  const byId = new Map(problems.map((p) => [p.id, p]));
  const todays = day.problemIds.map((id) => byId.get(id)).filter((p): p is ProblemDTO => !!p);
  const doneCount = todays.filter(isDone).length;
  const carry = carryOver(problems, clock.todayIndex);

  return (
    <div className="flex flex-col gap-6">
      <Header
        title={day.title}
        subtitle={formatDate(date, "EEEE, d MMMM yyyy")}
        meta={
          <>
            <span className="num">Day {clock.todayIndex + 1} of {PLAN_DAYS}</span>
            <span>·</span>
            <span className="num">Week {weekOf(clock.todayIndex)}</span>
            <span>·</span>
            <span>Phase {day.phase}</span>
            <DayTypeBadge type={day.type} />
          </>
        }
      />

      <div className="flex gap-3 rounded-xl border border-border bg-card p-4">
        <TargetIcon className="mt-0.5 size-5 shrink-0 text-accent" />
        <div className="flex flex-col gap-1">
          <span className="section-title">{day.type === "study" ? "Learn first" : "Today’s task"}</span>
          <p className="text-sm leading-relaxed">{day.focus}</p>
        </div>
      </div>

      {day.type === "study" ? (
        <>
          <Section
            title={
              <>
                Today’s problems <span className="num ml-1 normal-case">{doneCount}/{todays.length}</span>
              </>
            }
          >
            <Bar value={todays.length ? doneCount / todays.length : 0} fillClass="bg-easy" label="Today's progress" />
            <ProblemList problems={todays} options={{ keyIdea: "reveal", statusVariant: "segmented" }} />
          </Section>

          {carry.length > 0 && (
            <details className="group rounded-xl border border-border bg-card">
              <summary className="flex cursor-pointer list-none items-center gap-2 p-4 [&::-webkit-details-marker]:hidden">
                <span className="section-title">Carry over</span>
                <span className="num rounded-full bg-medium/15 px-2 text-xs text-medium">{carry.length}</span>
                <span className="text-xs text-muted-foreground">from earlier days, not solved yet</span>
                <ChevronDownIcon className="ml-auto size-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-3 pb-3">
                <ProblemList problems={carry} options={{ keyIdea: "reveal", statusVariant: "compact", showTopic: true }} />
              </div>
            </details>
          )}

          <RedoSection items={redoDue} />
        </>
      ) : (
        <>
          {day.type === "mock" && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-hard/30 bg-hard/5 p-4">
              <TimerIcon className="size-5 text-hard" />
              <p className="flex-1 text-sm">Timed mock day: 90 minutes, no hints. Log the result when you finish.</p>
              <Button asChild size="sm">
                <Link href="/mocks?new=1">
                  <FlagIcon /> Log a mock test
                </Link>
              </Button>
            </div>
          )}
          <RedoSection items={redoDue} />
          <AttemptedSection problems={attemptedBacklog(problems)} />
        </>
      )}

      <Section title="Day log">
        <DayLogCard
          dayIndex={clock.todayIndex}
          log={log}
          allProblemsDone={day.type === "study" && todays.length > 0 && doneCount === todays.length}
          dailyHours={clock.dailyHours}
        />
      </Section>
    </div>
  );
}

function Header({ title, subtitle, meta }: { title: string; subtitle: string; meta?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-muted-foreground">{subtitle}</p>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {meta && <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{meta}</div>}
    </div>
  );
}

function RedoSection({ items }: { items: RedoItem[] }) {
  return (
    <Section
      title={
        <>
          Redo due <span className="num ml-1 normal-case">{items.length}</span>
        </>
      }
      actions={
        <Link href="/revision" className="text-xs text-muted-foreground hover:text-foreground">
          All revision →
        </Link>
      }
    >
      {items.length ? (
        <RedoList items={items} compact />
      ) : (
        <EmptyState icon={<RotateCcwIcon />} title="No redos due" description="Starred problems come back at +1, +7 and +30 days." className="py-6" />
      )}
    </Section>
  );
}

function AttemptedSection({ problems }: { problems: ProblemDTO[] }) {
  return (
    <Section
      title={
        <>
          Attempted backlog <span className="num ml-1 normal-case">{problems.length}</span>
        </>
      }
    >
      {problems.length ? (
        <ProblemList problems={problems.slice(0, 15)} options={{ statusVariant: "compact", showTopic: true, keyIdea: "reveal" }} />
      ) : (
        <EmptyState title="Nothing stuck in Attempted" description="Problems you tried but couldn’t finish land here." className="py-6" />
      )}
    </Section>
  );
}

function DayPreview({ day, problems, title }: { day: ScheduleDayDTO; problems: ProblemDTO[]; title: string }) {
  const byId = new Map(problems.map((p) => [p.id, p]));
  const list = day.problemIds.map((id) => byId.get(id)).filter((p): p is ProblemDTO => !!p);
  return (
    <Section title={title}>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <DayTypeBadge type={day.type} />
          <span className="font-medium">{day.title}</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{day.focus}</p>
      </div>
      {list.length > 0 && <ProblemList problems={list} options={{ keyIdea: "reveal", statusVariant: "segmented" }} />}
    </Section>
  );
}
