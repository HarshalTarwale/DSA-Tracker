import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2Icon, CircleIcon, ExternalLinkIcon, PlayCircleIcon, TrophyIcon } from "lucide-react";
import { curatedBySlug, topicById } from "@/lib/content";
import { DIFFICULTY_CLASS, DIFFICULTY_LABEL } from "@/lib/constants";
import { addDays, diffDays, formatDate } from "@/lib/dates";
import { dayTotal, mondayOf, topicBlocks, type PlanDay } from "@/lib/plan";
import { countSolves } from "@/lib/progress";
import { leetcodeTagUrl, PRACTICE_PHASE_TARGET, videoLinks, type DiffTarget } from "@/lib/targets";
import type { SolveDTO } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getAppData, type AppData } from "@/server/data";
import { DifficultyBadge, StepBadge, TopicStatusBadge } from "@/components/shared/badges";
import { Section } from "@/components/shared/page";
import { Bar } from "@/components/shared/progress";

export const metadata: Metadata = { title: "Plan" };
export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const d = await getAppData();
  const { today, phase, settings, plan, todayDay, solves } = d;
  const todaySolves = solves.filter((s) => s.solvedDate === today && s.topicId !== null);

  // Week to show: the current one, or the first plan week before the start.
  const anchor = phase === "before" ? settings.startDate : today;
  const monday = mondayOf(anchor);
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm text-muted-foreground">{formatDate(today, "EEEE, d MMMM yyyy")}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Your plan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatDate(settings.startDate, "d MMM yyyy")} → {formatDate(settings.endDate, "d MMM yyyy")} main plan ·{" "}
          practice until {formatDate(settings.practiceEndDate, "d MMM yyyy")}
        </p>
      </div>

      <Section title="Today">
        {phase === "plan" && todayDay ? (
          <TodayCard day={todayDay} solvedToday={todaySolves} data={d} />
        ) : phase === "before" ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-border bg-card p-4 text-sm">
              The plan starts <b>{formatDate(settings.startDate, "EEEE d MMM")}</b> ({diffDays(settings.startDate, today)} days). Until then,
              warm up with Easy problems; anything you solve is already tracked.
            </div>
            {plan[0] && <TodayCard day={plan[0]} solvedToday={[]} data={d} preview />}
          </div>
        ) : (
          <PracticeCard data={d} solvedToday={todaySolves} />
        )}
      </Section>

      <Section title={phase === "before" ? "First week" : "This week"}>
        <WeekStrip days={week} data={d} />
      </Section>

      <Section title="Roadmap">
        <Roadmap data={d} />
      </Section>
    </div>
  );
}

function stepsFor(day: PlanDay, topicName: string) {
  if (day.step === "learn")
    return [
      { title: `Watch a video on ${topicName}`, text: "Take notes on the pattern, not the code." },
      { title: "Solve the 1–2 problems from the video yourself", text: "Close the video. Code it from memory, then compare." },
      { title: "Then today's target below", text: "Easy first. 25–30 minutes alone before any hint." },
    ];
  if (day.step === "review")
    return [
      { title: "LeetCode weekly contest", text: "Sunday 8:00 AM IST. Even 1–2 solved counts." },
      { title: "Re-solve this week's problems you needed help on", text: "From scratch, no AI, no editorial." },
      { title: "Write each pattern in one line", text: "\"sorted + pair → two pointers\" style." },
    ];
  if (day.step === "final")
    return [
      { title: "90-minute timed mock", text: "3 unseen problems, no hints, explain aloud as if in an interview." },
      { title: "Review every miss", text: "Re-solve it the next day without help." },
    ];
  return [
    { title: "25–30 minutes alone per problem", text: "Write the brute force first, then improve it." },
    { title: "Stuck? Ask AI for a hint, never the code", text: "Then write the whole solution yourself." },
    { title: "Needed help? Re-solve it tomorrow from scratch", text: "This is what builds the logic." },
  ];
}

function Targets({ target, solved }: { target: DiffTarget; solved: SolveDTO[] }) {
  const c = countSolves(solved);
  const total = dayTotal(target);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">Today&apos;s target</span>
        <span className="num text-xs text-muted-foreground">
          {c.total}/{total} solved today
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(["easy", "medium", "hard"] as const).map((k) => {
          const done = target[k] > 0 && c[k] >= target[k];
          return (
            <div key={k} className={cn("rounded-lg border p-2 text-center", done ? "border-easy/40 bg-easy/5" : "border-border")}>
              <p className={cn("text-xs", DIFFICULTY_CLASS[k].text)}>{DIFFICULTY_LABEL[k]}</p>
              <p className="num text-lg font-semibold">
                {c[k]}
                {target[k] > 0 ? (
                  <span className="text-sm text-muted-foreground">/{target[k]}</span>
                ) : (
                  c[k] > 0 && <span className="ml-1 text-xs font-normal text-easy">bonus</span>
                )}
              </p>
            </div>
          );
        })}
      </div>
      <Bar value={total ? c.total / total : 0} fillClass="bg-easy" label="Today's progress" />
    </div>
  );
}

function TodayCard({ day, solvedToday, data, preview = false }: { day: PlanDay; solvedToday: SolveDTO[]; data: AppData; preview?: boolean }) {
  const topic = day.topicId ? topicById.get(day.topicId) : null;
  const steps = stepsFor(day, topic?.name ?? "");
  const suggested = day.suggested.map((s) => curatedBySlug.get(s)).filter((p) => !!p);
  const tp = day.topicId ? data.progressById.get(day.topicId) : null;
  return (
    <div className="flex flex-col gap-5 rounded-xl border border-accent/40 bg-card p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="num">
          Day {day.index + 1} of {data.planDays}
        </span>
        <span>·</span>
        <span className="num">Week {day.week}</span>
        <StepBadge step={day.step} />
        {topic && <span className="num">Topic day {day.topicDay + 1} of {day.topicDays}</span>}
      </div>
      <div>
        <h2 className="text-xl font-semibold">
          {topic ? (
            <Link href={`/topics/${topic.id}`} className="hover:text-accent">
              {topic.name}
            </Link>
          ) : day.step === "review" ? (
            "Weekly review & contest"
          ) : (
            "Final revision & mocks"
          )}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{day.focus}</p>
        {tp && (
          <p className="mt-2 text-xs text-muted-foreground">
            Topic so far: <span className="num text-foreground">{tp.solved.total}</span>/<span className="num">{tp.target.total}</span>{" "}
            · <TopicStatusBadge status={tp.status} />
          </p>
        )}
      </div>

      <ol className="grid gap-2 md:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-3 rounded-lg border border-border bg-background/40 p-3">
            <span className="num flex size-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-medium text-accent">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-medium">{s.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>

      {topic && day.step === "learn" && (
        <div className="flex flex-wrap gap-2">
          {videoLinks(topic.name).map((v) => (
            <a
              key={v.url}
              href={v.url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-card-hover"
            >
              <PlayCircleIcon className="size-3.5 text-hard" /> {v.label}
            </a>
          ))}
        </div>
      )}

      {!preview && <Targets target={day.target} solved={solvedToday} />}
      {preview && (
        <p className="num text-sm text-muted-foreground">
          Target that day: {day.target.easy} Easy · {day.target.medium} Medium · {day.target.hard} Hard
        </p>
      )}

      {(suggested.length > 0 || topic) && (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium">Suggested problems</span>
            {topic && (
              <a href={leetcodeTagUrl(topic.id)} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                More {topic.name} on LeetCode <ExternalLinkIcon className="size-3" />
              </a>
            )}
          </div>
          {suggested.length ? (
            <ul className="flex flex-col gap-1.5">
              {suggested.map((p) => {
                const done = data.solvedSlugs.has(p.slug);
                return (
                  <li key={p.slug}>
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className={cn("flex items-center gap-3 rounded-lg border px-3 py-2 hover:bg-card-hover", done ? "border-easy/30" : "border-border")}
                    >
                      {done ? <CheckCircle2Icon className="size-4 shrink-0 text-easy" /> : <CircleIcon className="size-4 shrink-0 text-muted-foreground" />}
                      <span className="num w-10 shrink-0 text-xs text-muted-foreground">{p.lcNumber}</span>
                      <span className={cn("min-w-0 flex-1 truncate text-sm", done && "text-muted-foreground line-through")}>{p.title}</span>
                      <DifficultyBadge difficulty={p.difficulty} short />
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No fixed list today: pick from the LeetCode tag list (Medium first).</p>
          )}
          <p className="text-xs text-muted-foreground">Ticks itself when you get Accepted on LeetCode. Any other problem you solve counts too.</p>
        </div>
      )}
    </div>
  );
}

function PracticeCard({ data, solvedToday }: { data: AppData; solvedToday: SolveDTO[] }) {
  const weakest = [...data.progress].sort((a, b) => a.score - b.score).slice(0, 3);
  const since = data.solves.filter((s) => s.topicId && s.solvedDate > data.settings.endDate).length;
  const target: DiffTarget = { easy: 0, medium: 2, hard: 1 };
  return (
    <div className="flex flex-col gap-5 rounded-xl border border-accent/40 bg-card p-4 md:p-5">
      <div className="flex items-center gap-2">
        <TrophyIcon className="size-5 text-accent" />
        <h2 className="text-xl font-semibold">{data.phase === "practice" ? "Practice phase" : "Keep sharp"}</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Mixed problems from your weakest topics, timed (Medium 25 min, Hard 40 min). Practice-phase solves so far:{" "}
        <span className="num text-foreground">{since}</span>/<span className="num">{PRACTICE_PHASE_TARGET}</span>.
      </p>
      <Targets target={target} solved={solvedToday} />
      <div className="grid gap-2 sm:grid-cols-3">
        {weakest.map((p) => {
          const t = topicById.get(p.topicId)!;
          return (
            <a key={p.topicId} href={leetcodeTagUrl(p.topicId)} target="_blank" rel="noreferrer noopener" className="rounded-lg border border-border p-3 hover:bg-card-hover">
              <p className="text-sm font-medium">{t.name}</p>
              <p className="num mt-1 text-xs text-muted-foreground">{Math.round(p.score * 100)}% mastered · open on LeetCode</p>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function WeekStrip({ days, data }: { days: string[]; data: AppData }) {
  const byDate = new Map(data.plan.map((p) => [p.date, p]));
  const solvedOn = new Map<string, number>();
  for (const s of data.solves) if (s.topicId) solvedOn.set(s.solvedDate, (solvedOn.get(s.solvedDate) ?? 0) + 1);
  const weekTarget = days.reduce((a, d) => a + (byDate.get(d) ? dayTotal(byDate.get(d)!.target) : 0), 0);
  const weekSolved = days.reduce((a, d) => a + (solvedOn.get(d) ?? 0), 0);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
        {days.map((date) => {
          const p = byDate.get(date);
          const solved = solvedOn.get(date) ?? 0;
          const target = p ? dayTotal(p.target) : 0;
          const isToday = date === data.today;
          const past = date < data.today;
          const topic = p?.topicId ? topicById.get(p.topicId) : null;
          const met = target > 0 && solved >= target;
          return (
            <div
              key={date}
              className={cn(
                "flex items-center gap-3 rounded-xl border bg-card p-3 sm:flex-col sm:items-start sm:gap-1.5",
                isToday ? "border-accent ring-1 ring-accent/40" : "border-border",
                !p && "opacity-50",
              )}
            >
              <div className="w-16 shrink-0 sm:w-auto">
                <p className={cn("text-xs", isToday ? "font-semibold text-accent" : "text-muted-foreground")}>{isToday ? "Today" : formatDate(date, "EEE")}</p>
                <p className="num text-sm">{formatDate(date, "d MMM")}</p>
              </div>
              <p className="min-w-0 flex-1 truncate text-xs sm:w-full sm:flex-none" title={topic?.name}>
                {topic ? topic.name : p?.step === "review" ? "Review + contest" : p?.step === "final" ? "Mock / revision" : "Outside plan"}
              </p>
              {p && (
                <span
                  className={cn(
                    "num shrink-0 rounded-md px-1.5 py-0.5 text-xs",
                    met ? "bg-easy/15 text-easy" : past && solved < target ? "bg-hard/10 text-hard" : "bg-card-hover text-muted-foreground",
                  )}
                  title={`${solved} solved of ${target} target`}
                >
                  {met && "✓ "}
                  {solved}/{target}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <p className="num text-xs text-muted-foreground">
        Week total: {weekSolved}/{weekTarget} · Sunday is review day (contest + re-solve the week&apos;s tough ones)
      </p>
    </div>
  );
}

function Roadmap({ data }: { data: AppData }) {
  const blocks = topicBlocks(data.plan);
  const months = new Map<string, typeof blocks>();
  for (const b of blocks) {
    const key = b.start.slice(0, 7);
    months.set(key, [...(months.get(key) ?? []), b]);
  }
  const lastDays = data.plan.filter((p) => p.kind === "final");
  return (
    <div className="flex flex-col gap-5">
      {[...months.entries()].map(([month, list]) => (
        <div key={month} className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">{formatDate(`${month}-01`, "MMMM yyyy")}</h3>
          <ul className="flex flex-col gap-1.5">
            {list.map((b) => {
              const t = topicById.get(b.topicId)!;
              const p = data.progressById.get(b.topicId)!;
              const now = b.start <= data.today && b.end >= data.today;
              return (
                <li key={b.topicId}>
                  <Link
                    href={`/topics/${b.topicId}`}
                    className={cn(
                      "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-lg border bg-card px-3 py-2 hover:bg-card-hover sm:grid-cols-[8.5rem_minmax(0,1fr)_6rem_6.5rem]",
                      now ? "border-accent/60" : "border-border",
                    )}
                  >
                    <span className="num text-xs text-muted-foreground sm:col-start-1 sm:row-start-1">
                      {formatDate(b.start, "d MMM")} – {formatDate(b.end, "d MMM")}
                    </span>
                    <span className="col-span-2 row-start-2 truncate text-sm sm:col-span-1 sm:col-start-2 sm:row-start-1">
                      {t.name} {now && <span className="ml-1 text-[10px] font-semibold text-accent uppercase">Now</span>}
                    </span>
                    <span className="num hidden text-xs text-muted-foreground sm:col-start-3 sm:row-start-1 sm:inline">{b.days} days</span>
                    <TopicStatusBadge status={p.status} className="row-start-1 justify-self-end sm:col-start-4" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {lastDays.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {formatDate(lastDays[0].date, "d MMM")} – {formatDate(lastDays[lastDays.length - 1].date, "d MMM")}: final revision and timed mocks.
          Every Sunday is a review day.
        </p>
      )}
    </div>
  );
}
