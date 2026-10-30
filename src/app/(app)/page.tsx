import type { Metadata } from "next";
import { PLAN_DAYS, PLAN_WEEKS } from "@/lib/constants";
import { addDays, formatDate } from "@/lib/dates";
import {
  computeAvgMinutes,
  computeCurve,
  computeHeatmap,
  computeHowBreakdown,
  computeKpis,
  computeOnTrack,
  computeStreak,
  computeTopicStats,
  computeWeakSpots,
  computeWeekly,
  sumTopicStats,
} from "@/lib/metrics";
import { getEventCountsByDate } from "@/server/queries/activity";
import { getProblems } from "@/server/queries/problems";
import { getSchedule } from "@/server/queries/schedule";
import { getPlanClock } from "@/server/queries/settings";
import { getTopics } from "@/server/queries/topics";
import { HowDonut, PlannedVsActualChart, TopicChart, WeeklyChart } from "@/components/dashboard/lazy-charts";
import { KpiCards, OnTrackBanner, TopicTable, WeakSpots } from "@/components/dashboard/overview";
import { Heatmap } from "@/components/shared/heatmap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [clock, topics, problems, schedule, eventCounts] = await Promise.all([
    getPlanClock(),
    getTopics(),
    getProblems(),
    getSchedule(),
    getEventCountsByDate(),
  ]);
  const { today, startDate, endDate } = clock;

  const kpis = computeKpis(problems, startDate, PLAN_DAYS, today);
  const track = computeOnTrack(problems, schedule, clock.todayIndex);
  const streak = computeStreak(eventCounts.keys(), today);
  const stats = computeTopicStats(topics, problems, schedule, startDate);
  const totals = sumTopicStats(stats);
  const weak = computeWeakSpots(stats, today);
  const curve = computeCurve(schedule, problems, startDate, PLAN_DAYS, today);
  const weekly = computeWeekly(problems, startDate, PLAN_WEEKS);
  const heat = computeHeatmap(eventCounts, addDays(startDate, -21), endDate > today ? endDate : today);
  const how = computeHowBreakdown(problems);
  const avg = computeAvgMinutes(problems);
  const topicMap = new Map(topics.map((t) => [t.id, t]));

  return (
    <div className="flex flex-col gap-6">
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-10 h-48 bg-[radial-gradient(ellipse_at_top_left,color-mix(in_oklab,var(--accent)_12%,transparent),transparent_65%)]"
        />
        <div className="relative">
          <p className="text-sm text-muted-foreground">{formatDate(today, "EEEE, d MMMM yyyy")}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Am I progressing?</h1>
        </div>
      </div>

      <OnTrackBanner track={track} />
      <KpiCards kpis={kpis} streak={streak} />

      <Card>
        <CardHeader>
          <CardTitle>Planned vs actual (cumulative)</CardTitle>
        </CardHeader>
        <CardContent>
          <PlannedVsActualChart data={curve.map(({ date, planned, actual }) => ({ date, planned, actual }))} today={today} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <Heatmap cells={heat} today={today} planStart={startDate} planEnd={endDate} />
          </CardContent>
        </Card>
        <WeakSpots mode={weak.mode} stats={weak.topics} topics={topicMap} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardHeader>
            <CardTitle>Solved per week</CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyChart data={weekly.filter((w) => w.week > 0 || w.easy + w.medium + w.hard > 0)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>How you solve</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <HowDonut alone={how.alone} hint={how.hint} solution={how.solution} />
            <div className="grid w-full grid-cols-3 gap-2 text-center text-xs">
              <Legend label="Alone" value={how.alone} dot="bg-status-solved" />
              <Legend label="Hint" value={how.hint} dot="bg-status-attempted" />
              <Legend label="Solution" value={how.solution} dot="bg-hard" />
            </div>
            <div className="w-full border-t border-border pt-3">
              <p className="mb-2 text-xs text-muted-foreground">Average minutes</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <Avg label="Easy" value={avg.easy} cls="text-easy" />
                <Avg label="Medium" value={avg.medium} cls="text-medium" />
                <Avg label="Hard" value={avg.hard} cls="text-hard" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Target vs solved by topic</CardTitle>
        </CardHeader>
        <CardContent>
          <TopicChart
            data={stats.map((s) => ({
              name: topicMap.get(s.topicId)?.name ?? s.topicId,
              solved: s.solved.total,
              remaining: Math.max(0, s.remaining),
            }))}
          />
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="section-title">Topics</h2>
        <TopicTable stats={stats} topics={topicMap} totals={totals} />
      </section>
    </div>
  );
}

function Legend({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <span className={`size-2 rounded-full ${dot}`} />
        {label}
      </span>
      <span className="num text-sm font-medium">{value}</span>
    </div>
  );
}

function Avg({ label, value, cls }: { label: string; value: number | null; cls: string }) {
  return (
    <div className="flex flex-col">
      <span className={`text-xs ${cls}`}>{label}</span>
      <span className="num text-sm font-medium">{value ?? "–"}</span>
    </div>
  );
}
