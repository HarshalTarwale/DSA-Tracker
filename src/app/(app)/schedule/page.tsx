import type { Metadata } from "next";
import { PLAN_WEEKS } from "@/lib/constants";
import { dayIndexToDate, formatDate, weekLabel, weekOf } from "@/lib/dates";
import { isDone } from "@/lib/metrics";
import type { ProblemDTO } from "@/lib/types";
import { getProblems } from "@/server/queries/problems";
import { getDayLogs, getSchedule } from "@/server/queries/schedule";
import { getPlanClock } from "@/server/queries/settings";
import { getTopics } from "@/server/queries/topics";
import { PageHeader } from "@/components/shared/page";
import { DayCard } from "@/components/schedule/day-card";
import { ScrollToToday } from "@/components/schedule/scroll-to-today";

export const metadata: Metadata = { title: "Schedule" };
export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const [clock, schedule, problems, logs, topics] = await Promise.all([
    getPlanClock(),
    getSchedule(),
    getProblems(),
    getDayLogs(),
    getTopics(),
  ]);
  const byId = new Map(problems.map((p) => [p.id, p]));
  const topicName = new Map(topics.map((t) => [t.id, t.name]));

  const weeks = Array.from({ length: PLAN_WEEKS }, (_, i) => i + 1).map((week) => ({
    week,
    days: schedule.filter((d) => weekOf(d.dayIndex) === week),
  }));

  return (
    <>
      <PageHeader
        title="Schedule"
        description={`16 weeks · ${formatDate(clock.startDate, "d MMM yyyy")} → ${formatDate(clock.endDate, "d MMM yyyy")} · review every 7th day, 6 timed mocks`}
      />
      <div className="flex flex-col gap-8">
        {weeks.map(({ week, days }) => {
          const planned = days.flatMap((d) => d.problemIds).map((id) => byId.get(id)).filter((p): p is ProblemDTO => !!p);
          const done = planned.filter(isDone).length;
          const isCurrent = clock.phase === "during" && weekOf(clock.todayIndex) === week;
          return (
            <section key={week} aria-labelledby={`week-${week}`} className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-2">
                <h2 id={`week-${week}`} className={isCurrent ? "text-sm font-medium tracking-wide text-accent uppercase" : "section-title"}>
                  {weekLabel(clock.startDate, week)}
                </h2>
                {planned.length > 0 && (
                  <span className="num text-xs text-muted-foreground">
                    {done}/{planned.length} solved
                  </span>
                )}
              </div>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {days.map((d) => (
                  <DayCard
                    key={d.dayIndex}
                    day={d}
                    date={dayIndexToDate(clock.startDate, d.dayIndex)}
                    isToday={d.dayIndex === clock.todayIndex}
                    isPast={d.dayIndex < clock.todayIndex}
                    log={logs.get(d.dayIndex)}
                    problems={d.problemIds.map((id) => byId.get(id)).filter((p): p is ProblemDTO => !!p)}
                    topicName={d.topicId ? (topicName.get(d.topicId) ?? null) : null}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
      {clock.phase === "during" && <ScrollToToday id="today" />}
    </>
  );
}
