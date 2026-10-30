import Link from "next/link";
import { AlertTriangleIcon, CalendarClockIcon, FlameIcon, TrendingDownIcon, TrendingUpIcon, CheckIcon } from "lucide-react";
import { TOPIC_STATUS_CLASS } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import type { Kpis, OnTrack, Streak, TopicStats } from "@/lib/metrics";
import type { TopicDTO } from "@/lib/types";
import { cn, pluralize } from "@/lib/utils";
import { PriorityBadge } from "@/components/shared/badges";
import { Bar, DiffBar, ProgressRing } from "@/components/shared/progress";

export function KpiCards({ kpis, streak }: { kpis: Kpis; streak: Streak }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div className="col-span-2 flex items-center gap-4 rounded-xl border border-border bg-card p-4">
        <ProgressRing value={kpis.pct} size={72} stroke={6} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div>
            <span className="text-xs text-muted-foreground">Solved / Target</span>
            <p className="num text-2xl font-semibold">
              {kpis.solved.total}
              <span className="text-base text-muted-foreground"> / {kpis.target.total}</span>
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <DiffBar label="Easy" solved={kpis.solved.easy} target={kpis.target.easy} fillClass="bg-easy" />
            <DiffBar label="Medium" solved={kpis.solved.medium} target={kpis.target.medium} fillClass="bg-medium" />
            <DiffBar label="Hard" solved={kpis.solved.hard} target={kpis.target.hard} fillClass="bg-hard" />
          </div>
        </div>
      </div>
      <Kpi label="Days left" value={kpis.daysLeft} sub={`Plan ends ${formatDate(kpis.endDate, "EEE d MMM yyyy")}`} />
      <Kpi label="Pace needed / day" value={kpis.paceNeeded.toFixed(1)} sub={`${kpis.remaining} problems remaining`} />
      <Kpi
        className="col-span-2 lg:col-span-4 xl:col-span-2"
        label="Current streak"
        value={
          <span className="flex items-center gap-2">
            <FlameIcon className={cn("size-5", streak.current > 0 ? "text-medium" : "text-muted-foreground")} />
            {streak.current} <span className="text-sm font-normal text-muted-foreground">{streak.current === 1 ? "day" : "days"}</span>
          </span>
        }
        sub={
          <>
            Longest {pluralize(streak.longest, "day")}
            {!streak.activeToday && streak.current > 0 && <span className="text-medium"> · keep it alive today</span>}
            {!streak.activeToday && streak.current === 0 && <span> · solve one to start a streak</span>}
          </>
        }
      />
    </div>
  );
}

function Kpi({ label, value, sub, className }: { label: string; value: React.ReactNode; sub?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1 rounded-xl border border-border bg-card p-4", className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="num text-2xl font-semibold">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

export function OnTrackBanner({ track }: { track: OnTrack }) {
  const { tone, delta } = track;
  const config = {
    "not-started": { icon: CalendarClockIcon, cls: "border-border bg-card", iconCls: "text-accent" },
    ahead: { icon: TrendingUpIcon, cls: "border-easy/30 bg-easy/10", iconCls: "text-easy" },
    "on-track": { icon: CheckIcon, cls: "border-easy/30 bg-easy/10", iconCls: "text-easy" },
    behind: { icon: TrendingDownIcon, cls: "border-medium/30 bg-medium/10", iconCls: "text-medium" },
    "far-behind": { icon: AlertTriangleIcon, cls: "border-hard/30 bg-hard/10", iconCls: "text-hard" },
  }[tone];
  const Icon = config.icon;

  let text: React.ReactNode;
  if (tone === "not-started") text = <>Plan starts in <b className="num">{pluralize(track.daysUntilStart, "day")}</b>.</>;
  else if (tone === "ahead") text = <>You are <b className="num text-easy">{delta} ahead</b> of plan.</>;
  else if (tone === "on-track") text = <b className="text-easy">On track.</b>;
  else
    text = (
      <>
        <b className={cn("num", tone === "far-behind" ? "text-hard" : "text-medium")}>{-delta} behind</b> plan, about{" "}
        <b className="num">{track.extraPerDay}</b> extra per day for a week clears it.
      </>
    );

  return (
    <div role="status" className={cn("flex items-center gap-3 rounded-xl border px-4 py-3", config.cls)}>
      <Icon className={cn("size-5 shrink-0", config.iconCls)} />
      <p className="flex-1 text-sm">{text}</p>
      {tone !== "not-started" && (
        <span className="num hidden text-xs text-muted-foreground sm:inline">
          {track.solvedPlanned} solved vs {track.plannedByYesterday} planned by yesterday
        </span>
      )}
    </div>
  );
}

export function WeakSpots({
  mode,
  stats,
  topics,
}: {
  mode: "ended" | "current";
  stats: TopicStats[];
  topics: Map<string, TopicDTO>;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div>
        <h2 className="section-title">Weak spots</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {mode === "ended" ? "Lowest % among topics whose dates have passed" : "No topic has ended yet. In progress now:"}
        </p>
      </div>
      {stats.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing yet. Check back once the plan starts.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {stats.map((s) => (
            <li key={s.topicId}>
              <Link href={`/topics/${s.topicId}`} className="group flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate group-hover:text-accent">{topics.get(s.topicId)?.name}</span>
                  <span className="num text-xs text-muted-foreground">
                    {s.solved.total}/{s.target.total}
                  </span>
                </div>
                <Bar value={s.pct} fillClass={s.pct < 0.5 ? "bg-hard" : s.pct < 0.8 ? "bg-medium" : "bg-easy"} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TopicTable({
  stats,
  topics,
  totals,
}: {
  stats: TopicStats[];
  topics: Map<string, TopicDTO>;
  totals: { target: TopicStats["target"]; solved: TopicStats["solved"]; studyDays: number; pct: number; remaining: number };
}) {
  const d = (s: string | null) => (s ? formatDate(s, "d MMM") : "–");
  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-border lg:block">
        <table className="w-full text-sm">
          <thead className="bg-surface text-xs text-muted-foreground">
            <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:font-medium">
              <th className="text-left">#</th>
              <th className="text-left">Topic</th>
              <th>Pri</th>
              <th className="text-left">Start – End</th>
              <th title="Study days">Days</th>
              <th title="Target Easy / Medium / Hard / Total">Target E·M·H·T</th>
              <th title="Solved Easy / Medium / Hard / Total">Solved E·M·H·T</th>
              <th className="w-36 text-left">% complete</th>
              <th>Left</th>
              <th className="text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {stats.map((s) => {
              const t = topics.get(s.topicId)!;
              return (
                <tr key={s.topicId} className="bg-card transition-colors hover:bg-card-hover [&>td]:px-3 [&>td]:py-2">
                  <td className="num text-muted-foreground">{t.order}</td>
                  <td>
                    <Link href={`/topics/${t.id}`} className="hover:text-accent">
                      {t.name}
                    </Link>
                  </td>
                  <td className="text-center">
                    <PriorityBadge priority={t.priority} />
                  </td>
                  <td className="num text-xs whitespace-nowrap text-muted-foreground">
                    {d(s.startDate)} – {d(s.endDate)}
                  </td>
                  <td className="num text-center">{s.studyDays}</td>
                  <td className="num text-center text-xs whitespace-nowrap">
                    <Ehmt c={s.target} />
                  </td>
                  <td className="num text-center text-xs whitespace-nowrap">
                    <Ehmt c={s.solved} />
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Bar value={s.pct} className="flex-1" />
                      <span className="num w-9 text-right text-xs">{Math.round(s.pct * 100)}%</span>
                    </div>
                  </td>
                  <td className="num text-center">{s.remaining}</td>
                  <td className={cn("text-xs whitespace-nowrap", TOPIC_STATUS_CLASS[s.status])}>{s.status}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-surface font-medium">
            <tr className="[&>td]:px-3 [&>td]:py-2">
              <td />
              <td>Total</td>
              <td />
              <td />
              <td className="num text-center">{totals.studyDays}</td>
              <td className="num text-center text-xs">
                <Ehmt c={totals.target} />
              </td>
              <td className="num text-center text-xs">
                <Ehmt c={totals.solved} />
              </td>
              <td>
                <div className="flex items-center gap-2">
                  <Bar value={totals.pct} className="flex-1" />
                  <span className="num w-9 text-right text-xs">{Math.round(totals.pct * 100)}%</span>
                </div>
              </td>
              <td className="num text-center">{totals.remaining}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile / tablet cards */}
      <ul className="grid gap-2 sm:grid-cols-2 lg:hidden">
        {stats.map((s) => {
          const t = topics.get(s.topicId)!;
          return (
            <li key={s.topicId}>
              <Link href={`/topics/${t.id}`} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 hover:bg-card-hover">
                <div className="flex items-center gap-2">
                  <span className="num text-xs text-muted-foreground">{t.order}</span>
                  <span className="flex-1 truncate text-sm font-medium">{t.name}</span>
                  <PriorityBadge priority={t.priority} />
                </div>
                <div className="flex items-center gap-2">
                  <Bar value={s.pct} className="flex-1" />
                  <span className="num text-xs">
                    {s.solved.total}/{s.target.total}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="num">
                    {d(s.startDate)} – {d(s.endDate)} · {s.studyDays}d
                  </span>
                  <span className={TOPIC_STATUS_CLASS[s.status]}>{s.status}</span>
                </div>
              </Link>
            </li>
          );
        })}
        <li className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 text-sm font-medium sm:col-span-2">
          <span>Total</span>
          <span className="num">
            {totals.solved.total}/{totals.target.total} · {Math.round(totals.pct * 100)}% · {totals.remaining} left
          </span>
        </li>
      </ul>
    </>
  );
}

function Ehmt({ c }: { c: TopicStats["target"] }) {
  return (
    <>
      <span className="text-easy">{c.easy}</span>
      <span className="text-muted-foreground">·</span>
      <span className="text-medium">{c.medium}</span>
      <span className="text-muted-foreground">·</span>
      <span className="text-hard">{c.hard}</span>
      <span className="text-muted-foreground">·</span>
      <span>{c.total}</span>
    </>
  );
}
