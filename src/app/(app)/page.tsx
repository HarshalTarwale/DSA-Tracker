import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangleIcon, ArrowRightIcon, CalendarClockIcon, CheckIcon, FlameIcon, TargetIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { topics } from "@/lib/content";
import { addDays, diffDays, formatDate } from "@/lib/dates";
import { dayTotal, expectedThrough, mondayOf } from "@/lib/plan";
import { computeHeatmap, computePace, computeStreak, countSolves, tierReadiness, weakTopics, type Pace } from "@/lib/progress";
import { TIERS, totalTarget } from "@/lib/targets";
import { cn, pluralize } from "@/lib/utils";
import { getAppData } from "@/server/data";
import { EmptyState } from "@/components/shared/page";
import { Heatmap } from "@/components/shared/heatmap";
import { DiffBar, ProgressRing } from "@/components/shared/progress";
import { TierLadder, TopicRow } from "@/components/progress/progress-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const d = await getAppData();
  const { settings, solves, today, phase, plan, todayDay, progress, progressById, blockEnd } = d;

  const dsa = solves.filter((s) => s.topicId !== null);
  const counts = countSolves(dsa);
  const goal = totalTarget();
  const sinceStart = dsa.filter((s) => s.solvedDate >= settings.startDate);
  const pace = computePace(expectedThrough(plan, addDays(today, -1)), sinceStart.length, phase !== "before");
  const streak = computeStreak(solves.map((s) => s.solvedDate), today);

  const monday = mondayOf(today);
  const sunday = addDays(monday, 6);
  const weekPlan = plan.filter((p) => p.date >= monday && p.date <= sunday);
  const weekTarget = weekPlan.reduce((a, p) => a + dayTotal(p.target), 0);
  const weekSolved = dsa.filter((s) => s.solvedDate >= monday && s.solvedDate <= sunday).length;
  const todaySolved = dsa.filter((s) => s.solvedDate === today).length;

  const tiers = TIERS.map((t) => tierReadiness(t, topics, progressById));
  const readyFor = [...tiers].reverse().find((t) => t.ready);
  const weak = weakTopics(progress, blockEnd, today);
  const currentTopic = todayDay?.topicId ?? null;

  const counts7 = new Map<string, number>();
  for (const s of solves) counts7.set(s.solvedDate, (counts7.get(s.solvedDate) ?? 0) + 1);
  const heatFrom = addDays(settings.startDate, -14);
  const heatTo = today > settings.endDate ? today : settings.endDate;
  const heat = computeHeatmap(counts7, heatFrom < addDays(today, -180) ? addDays(today, -180) : heatFrom, heatTo);

  const lc = settings.leetcodeTotals;
  const lcTracked = solves.filter((s) => s.source === "leetcode").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-10 h-48 bg-[radial-gradient(ellipse_at_top_left,color-mix(in_oklab,var(--accent)_12%,transparent),transparent_65%)]"
        />
        <div className="relative">
          <p className="text-sm text-muted-foreground">{formatDate(today, "EEEE, d MMMM yyyy")}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Goal: Tier C · 30–50 LPA</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <PhaseLine phase={phase} start={settings.startDate} end={settings.endDate} practiceEnd={settings.practiceEndDate} today={today} />
          </p>
        </div>
      </div>

      {!settings.leetcodeUsername && !settings.hackerrankUsername && (
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm hover:bg-accent/15"
        >
          <TargetIcon className="size-5 shrink-0 text-accent" />
          <span className="flex-1">
            <b>Connect your LeetCode username</b> so every problem you solve is counted here automatically, topic-wise.
          </span>
          <ArrowRightIcon className="size-4 text-accent" />
        </Link>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 md:col-span-1">
          <ProgressRing value={counts.total / goal.total} size={76} stroke={6} />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div>
              <span className="text-xs text-muted-foreground">Solved / Tier C benchmark</span>
              <p className="num text-2xl font-semibold">
                {counts.total}
                <span className="text-base text-muted-foreground"> / {goal.total}</span>
              </p>
            </div>
            <DiffBar label="Easy" solved={counts.easy} target={goal.easy} fillClass="bg-easy" />
            <DiffBar label="Medium" solved={counts.medium} target={goal.medium} fillClass="bg-medium" />
            <DiffBar label="Hard" solved={counts.hard} target={goal.hard} fillClass="bg-hard" />
          </div>
        </div>
        <PaceCard pace={pace} todayTarget={todayDay ? dayTotal(todayDay.target) : null} todaySolved={todaySolved} />
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <div>
            <span className="text-xs text-muted-foreground">This week (Mon–Sun)</span>
            <p className="num text-2xl font-semibold">
              {weekSolved}
              <span className="text-base text-muted-foreground"> / {weekTarget || "–"}</span>
            </p>
          </div>
          <DiffBar label="Weekly target" solved={weekSolved} target={weekTarget} fillClass="bg-accent" />
          <div className="mt-auto flex items-center gap-2 border-t border-border pt-3 text-sm">
            <FlameIcon className={cn("size-4", streak.current > 0 ? "text-medium" : "text-muted-foreground")} />
            <span className="num font-semibold">{pluralize(streak.current, "day")}</span>
            <span className="text-xs text-muted-foreground">
              streak · best {streak.longest}
              {!streak.activeToday && streak.current > 0 && <span className="text-medium"> · solve one today</span>}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader>
            <CardTitle>Where you stand</CardTitle>
            <p className="text-sm">
              {readyFor ? (
                <>
                  Topic-wise you are ready for <b className="text-easy">Tier {readyFor.tier.key}</b> ({readyFor.tier.packageLpa}).
                </>
              ) : (
                <>Master the topics below to unlock each tier. Tier C is your target.</>
              )}
            </p>
          </CardHeader>
          <CardContent>
            <TierLadder tiers={tiers} solvedTotal={counts.total} compact />
            <Link href="/companies" className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              What each tier asks <ArrowRightIcon className="size-3" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Improve next</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {weak.length ? (
              <>
                <p className="text-xs text-muted-foreground">Topics whose dates have passed but aren&apos;t mastered yet, weakest first:</p>
                {weak.map((p) => {
                  const t = topics.find((x) => x.id === p.topicId)!;
                  const need = [
                    p.need.easy && `${p.need.easy} Easy`,
                    p.need.medium && `${p.need.medium} Medium`,
                    p.need.hard && `${p.need.hard} Hard`,
                  ].filter(Boolean);
                  return (
                    <Link key={p.topicId} href={`/topics/${p.topicId}`} className="rounded-lg border border-border p-3 hover:bg-card-hover">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate font-medium">{t.name}</span>
                        <span className="num text-xs text-muted-foreground">{Math.round(p.score * 100)}%</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">Still need: {need.join(" · ")}</p>
                    </Link>
                  );
                })}
              </>
            ) : currentTopic ? (
              <>
                <p className="text-xs text-muted-foreground">Nothing overdue. Today&apos;s topic:</p>
                <TopicRow p={progressById.get(currentTopic)!} current />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing to fix yet. Topics show up here if their week passes before you master them.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="section-title">Topic progress</h2>
          <span className="text-xs text-muted-foreground">solved / target to master · E M H</span>
        </div>
        <div className="flex flex-col rounded-xl border border-border bg-card p-1.5">
          {progress.map((p) => (
            <TopicRow key={p.topicId} p={p} current={p.topicId === currentTopic} />
          ))}
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {solves.length ? (
            <Heatmap cells={heat} today={today} planStart={settings.startDate} planEnd={settings.endDate} />
          ) : (
            <EmptyState title="No solves tracked yet" description="Solve a problem on LeetCode and it shows up here within minutes of opening the app." className="py-6" />
          )}
          {lc && (
            <p className="mt-3 text-xs text-muted-foreground">
              LeetCode profile: <span className="num text-foreground">{lc.all}</span> solved (E {lc.easy} · M {lc.medium} · H {lc.hard}).
              {lc.all > lcTracked && (
                <>
                  {" "}
                  <span className="num">{lc.all - lcTracked}</span> of those were solved before tracking began, so they aren&apos;t split by
                  topic.
                </>
              )}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PhaseLine({ phase, start, end, practiceEnd, today }: { phase: string; start: string; end: string; practiceEnd: string; today: string }) {
  if (phase === "before")
    return (
      <>
        Main plan starts {formatDate(start, "EEE d MMM")} ({pluralize(diffDays(start, today), "day")} to go) and runs to {formatDate(end, "d MMM yyyy")}.
      </>
    );
  if (phase === "plan")
    return (
      <>
        Main plan · {pluralize(diffDays(end, today), "day")} left (ends {formatDate(end, "d MMM")}), then practice until{" "}
        {formatDate(practiceEnd, "d MMM")}.
      </>
    );
  if (phase === "practice")
    return <>Practice phase · {pluralize(diffDays(practiceEnd, today), "day")} left. Mixed problems from your weakest topics every day.</>;
  return <>Both phases are done. Keep doing the weekly contest and revise weak topics.</>;
}

function PaceCard({ pace, todayTarget, todaySolved }: { pace: Pace; todayTarget: number | null; todaySolved: number }) {
  const cfg = {
    before: { icon: CalendarClockIcon, cls: "text-accent", text: "Plan hasn't started" },
    ahead: { icon: TrendingUpIcon, cls: "text-easy", text: `${pace.delta} ahead of plan` },
    "on-track": { icon: CheckIcon, cls: "text-easy", text: "On track" },
    behind: { icon: TrendingDownIcon, cls: "text-medium", text: `${-pace.delta} behind plan` },
    "far-behind": { icon: AlertTriangleIcon, cls: "text-hard", text: `${-pace.delta} behind plan` },
  }[pace.tone];
  const Icon = cfg.icon;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <span className="text-xs text-muted-foreground">Pace</span>
      <p className={cn("flex items-center gap-2 text-xl font-semibold", cfg.cls)}>
        <Icon className="size-5" /> {cfg.text}
      </p>
      {pace.tone !== "before" && (
        <p className="text-xs text-muted-foreground tabular-nums">
          {pace.actual} solved since the start vs {pace.expected} planned by yesterday
          {pace.delta < -2 && <> · about {Math.ceil(-pace.delta / 7)} extra a day for a week catches up</>}
        </p>
      )}
      {todayTarget !== null && (
        <div className="mt-auto border-t border-border pt-3">
          <DiffBar label="Today" solved={todaySolved} target={todayTarget} fillClass="bg-easy" />
        </div>
      )}
    </div>
  );
}
