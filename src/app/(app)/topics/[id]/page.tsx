import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { companyTiers } from "@/lib/content";
import { TOPIC_STATUS_CLASS } from "@/lib/constants";
import { dayIndexToDate, formatDate } from "@/lib/dates";
import { computeAvgMinutes, computeHowBreakdown, computeTopicStats } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import { getProblems } from "@/server/queries/problems";
import { getSchedule } from "@/server/queries/schedule";
import { getPlanClock } from "@/server/queries/settings";
import { getTopics } from "@/server/queries/topics";
import { ImportanceDots, PriorityBadge } from "@/components/shared/badges";
import { Section, Stat } from "@/components/shared/page";
import { DiffBar, ProgressRing } from "@/components/shared/progress";
import { AddProblemDialog } from "@/components/problems/add-dialog";
import { ProblemList } from "@/components/problems/problem-list";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/topics/[id]">): Promise<Metadata> {
  const { id } = await params;
  const topic = (await getTopics()).find((t) => t.id === id);
  return { title: topic?.name ?? "Topic" };
}

export default async function TopicPage({ params }: PageProps<"/topics/[id]">) {
  const { id } = await params;
  const [clock, topics, problems, schedule] = await Promise.all([getPlanClock(), getTopics(), getProblems(), getSchedule()]);
  const topic = topics.find((t) => t.id === id);
  if (!topic) notFound();

  const s = computeTopicStats([topic], problems, schedule, clock.startDate)[0];
  const list = problems.filter((p) => p.topicId === id);
  const how = computeHowBreakdown(list);
  const avg = computeAvgMinutes(list);
  const times = list.filter((p) => p.timeMinutes && (p.status === "solved" || p.status === "revised"));
  const avgAll = times.length ? Math.round(times.reduce((a, p) => a + (p.timeMinutes ?? 0), 0) / times.length) : null;
  const days = schedule.filter((d) => d.type === "study" && d.topicId === id);
  const doneHow = how.alone + how.hint + how.solution;
  const tiers = [
    { key: "A", value: topic.importanceA, tier: companyTiers[0] },
    { key: "B", value: topic.importanceB, tier: companyTiers[1] },
    { key: "C", value: topic.importanceC, tier: companyTiers[2] },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/topics" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" /> All topics
      </Link>

      <div className="flex flex-wrap items-center gap-4">
        <ProgressRing value={s.pct} size={72} stroke={6} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="num">Topic {topic.order}</span>
            <PriorityBadge priority={topic.priority} />
            <span>Phase {topic.phase}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{topic.name}</h1>
          <p className="num text-sm text-muted-foreground">
            {s.startDate ? `${formatDate(s.startDate, "EEE d MMM")} – ${formatDate(s.endDate!, "EEE d MMM")}` : "Not scheduled"} ·{" "}
            {s.studyDays} study days · <span className={TOPIC_STATUS_CLASS[s.status]}>{s.status}</span>
          </p>
        </div>
        <AddProblemDialog defaultTopicId={topic.id} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Solved / target" value={`${s.solved.total}/${s.target.total}`} sub={`${Math.round(s.pct * 100)}% complete · ${s.remaining} left`} />
        <Stat
          label="Average time"
          value={avgAll !== null ? `${avgAll}m` : "–"}
          sub={`E ${avg.easy ?? "–"} · M ${avg.medium ?? "–"} · H ${avg.hard ?? "–"}`}
        />
        <Stat
          label="Solved alone"
          value={doneHow ? `${Math.round((how.alone / doneHow) * 100)}%` : "–"}
          sub={`${how.alone} alone · ${how.hint} hint · ${how.solution} solution`}
        />
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
          <span className="text-xs text-muted-foreground">By difficulty</span>
          <DiffBar label="Easy" solved={s.solved.easy} target={s.target.easy} fillClass="bg-easy" />
          <DiffBar label="Medium" solved={s.solved.medium} target={s.target.medium} fillClass="bg-medium" />
          <DiffBar label="Hard" solved={s.solved.hard} target={s.target.hard} fillClass="bg-hard" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Section title={`Problems (${list.length})`}>
          <ProblemList problems={list} options={{ statusVariant: "segmented", keyIdea: "reveal" }} />
        </Section>

        <div className="flex flex-col gap-6">
          <Section title="Daily focus">
            <ol className="flex flex-col gap-2">
              {days.map((d, i) => {
                const date = dayIndexToDate(clock.startDate, d.dayIndex);
                const isToday = d.dayIndex === clock.todayIndex;
                return (
                  <li
                    key={d.dayIndex}
                    className={cn("rounded-xl border bg-card p-3", isToday ? "border-accent/60" : "border-border")}
                  >
                    <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="num">Day {i + 1}</span>
                      <span>·</span>
                      <span className="num">{formatDate(date, "EEE d MMM")}</span>
                      {isToday && <span className="font-medium text-accent">Today</span>}
                    </div>
                    <p className="text-sm leading-relaxed">{topic.dailyFocus[i] ?? d.focus}</p>
                  </li>
                );
              })}
            </ol>
          </Section>

          <Section title="Company importance">
            <ul className="flex flex-col gap-2">
              {tiers.map((t) => (
                <li key={t.key} className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t.tier?.tier ?? `Tier ${t.key}`}</span>
                    <ImportanceDots value={t.value} label={t.key} />
                  </div>
                  {t.tier && <p className="text-xs text-muted-foreground">{t.tier.examples}</p>}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">0–3 scale. Judgment-based synthesis, not official company data.</p>
          </Section>
        </div>
      </div>
    </div>
  );
}
