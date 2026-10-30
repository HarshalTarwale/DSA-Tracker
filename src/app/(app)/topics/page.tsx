import type { Metadata } from "next";
import Link from "next/link";
import { TOPIC_STATUS_CLASS } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { computeTopicStats } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import { getProblems } from "@/server/queries/problems";
import { getSchedule } from "@/server/queries/schedule";
import { getPlanClock } from "@/server/queries/settings";
import { getTopics } from "@/server/queries/topics";
import { ImportanceDots, PriorityBadge } from "@/components/shared/badges";
import { PageHeader } from "@/components/shared/page";
import { DiffBar, ProgressRing } from "@/components/shared/progress";

export const metadata: Metadata = { title: "Topics" };
export const dynamic = "force-dynamic";

export default async function TopicsPage() {
  const [clock, topics, problems, schedule] = await Promise.all([getPlanClock(), getTopics(), getProblems(), getSchedule()]);
  const stats = new Map(computeTopicStats(topics, problems, schedule, clock.startDate).map((s) => [s.topicId, s]));

  return (
    <>
      <PageHeader title="Topics" description="25 topics in plan order, ordered by how often companies test them." />
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {topics.map((t) => {
          const s = stats.get(t.id)!;
          const current = !!s.startDate && s.startDate <= clock.today && (s.endDate ?? "") >= clock.today;
          return (
            <li key={t.id}>
              <Link
                href={`/topics/${t.id}`}
                className={cn(
                  "flex h-full flex-col gap-3 rounded-xl border bg-card p-4 transition-colors duration-150 hover:bg-card-hover",
                  current ? "border-accent/50" : "border-border",
                )}
              >
                <div className="flex items-start gap-3">
                  <ProgressRing value={s.pct} size={52} stroke={5} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="num text-xs text-muted-foreground">{t.order}</span>
                      <PriorityBadge priority={t.priority} />
                      {current && <span className="text-[11px] font-medium text-accent">Now</span>}
                    </div>
                    <h2 className="font-medium leading-snug">{t.name}</h2>
                    <p className="num text-xs text-muted-foreground">
                      {s.startDate ? `${formatDate(s.startDate, "d MMM")} – ${formatDate(s.endDate!, "d MMM")}` : "–"} · {s.studyDays}d
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <DiffBar label="E" solved={s.solved.easy} target={s.target.easy} fillClass="bg-easy" />
                  <DiffBar label="M" solved={s.solved.medium} target={s.target.medium} fillClass="bg-medium" />
                  <DiffBar label="H" solved={s.solved.hard} target={s.target.hard} fillClass="bg-hard" />
                </div>
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
                  <span className={cn("text-xs", TOPIC_STATUS_CLASS[s.status])}>{s.status}</span>
                  <span className="flex gap-3">
                    <ImportanceDots value={t.importanceA} label="A" />
                    <ImportanceDots value={t.importanceB} label="B" />
                    <ImportanceDots value={t.importanceC} label="C" />
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
