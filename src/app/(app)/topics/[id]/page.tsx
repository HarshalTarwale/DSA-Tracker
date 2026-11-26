import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, CheckCircle2Icon, CircleIcon, ExternalLinkIcon, LightbulbIcon, PlayCircleIcon } from "lucide-react";
import { curatedProblems, patternTriggers, topicById } from "@/lib/content";
import { TOPIC_STATUS_CLASS } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { STEP_LABEL } from "@/lib/constants";
import { TIERS, leetcodeTagUrl, videoLinks } from "@/lib/targets";
import { cn } from "@/lib/utils";
import { getAppData } from "@/server/data";
import { DifficultyBadge, ImportanceDots, PriorityBadge, SourceBadge, TopicStatusBadge } from "@/components/shared/badges";
import { EmptyState, Section } from "@/components/shared/page";
import { DiffBar, ProgressRing } from "@/components/shared/progress";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/topics/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: topicById.get(id)?.name ?? "Topic" };
}

/** Pattern triggers whose pattern text mentions this topic's key words. */
const TRIGGER_KEYS: Record<string, string[]> = {
  "two-pointers": ["two pointer"],
  "sliding-window": ["sliding window", "window"],
  "binary-search": ["binary search"],
  hashing: ["hash", "dict", "set"],
  "prefix-sum-subarrays": ["prefix"],
  "stack-queue": ["stack", "queue"],
  "heap-priority-queue": ["heap"],
  "graphs-bfs-dfs-grids": ["bfs", "dfs", "graph"],
  "graphs-topo-sort-union-find": ["topological", "union"],
  "graphs-shortest-path-mst": ["dijkstra", "shortest"],
  "recursion-backtracking": ["backtrack", "recursion"],
  "dp-1d-grid": ["dp", "dynamic"],
  "dp-knapsack-subsequences": ["dp", "knapsack", "dynamic"],
  "dp-strings-advanced": ["dp", "dynamic"],
  greedy: ["greedy"],
  trie: ["trie"],
  "sorting-intervals": ["sort", "interval"],
  "linked-list": ["fast", "slow", "linked"],
  "bit-manipulation": ["xor", "bit"],
  "trees-bst": ["tree", "bst"],
};

export default async function TopicPage({ params }: PageProps<"/topics/[id]">) {
  const { id } = await params;
  const topic = topicById.get(id);
  if (!topic) notFound();
  const d = await getAppData();
  const p = d.progressById.get(id)!;
  const days = d.plan.filter((x) => x.topicId === id);
  const suggested = curatedProblems.filter((c) => c.topicId === id);
  const mine = d.solves.filter((s) => s.topicId === id);
  const keys = TRIGGER_KEYS[id] ?? [];
  const triggers = patternTriggers.filter((t) => keys.some((k) => `${t.pattern} ${t.trigger}`.toLowerCase().includes(k)));
  const solvedSuggested = suggested.filter((c) => d.solvedSlugs.has(c.slug)).length;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/topics" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" /> All topics
      </Link>

      <div className="flex flex-wrap items-center gap-4">
        <ProgressRing value={p.score} size={76} stroke={6} colorClass={p.status === "not-started" ? "text-accent" : TOPIC_STATUS_CLASS[p.status].text} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="num">Topic {topic.order}</span>
            <PriorityBadge priority={topic.priority} />
            <TopicStatusBadge status={p.status} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{topic.name}</h1>
          <p className="num text-sm text-muted-foreground">
            {days.length ? `${formatDate(days[0].date, "EEE d MMM")} – ${formatDate(days[days.length - 1].date, "EEE d MMM")} · ${days.length} study days` : "Not scheduled"}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium">Master it: solve this many</span>
            <span className="num text-xs text-muted-foreground">
              {p.solved.total}/{p.target.total}
            </span>
          </div>
          <DiffBar label="Easy" solved={p.solved.easy} target={p.target.easy} fillClass="bg-easy" />
          <DiffBar label="Medium" solved={p.solved.medium} target={p.target.medium} fillClass="bg-medium" />
          <DiffBar label="Hard" solved={p.solved.hard} target={p.target.hard} fillClass="bg-hard" />
          <p className="text-xs text-muted-foreground">
            {p.status === "mastered"
              ? "Mastered. Keep it fresh with 1–2 problems a week."
              : `Still need ${[p.need.easy && `${p.need.easy} Easy`, p.need.medium && `${p.need.medium} Medium`, p.need.hard && `${p.need.hard} Hard`].filter(Boolean).join(" · ")}.`}
          </p>
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <span className="text-sm font-medium">Who asks this</span>
          <ul className="flex flex-col gap-2 text-sm">
            {TIERS.map((t) => (
              <li key={t.key} className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">
                  Tier {t.key} · <span className="num">{t.packageLpa}</span>
                </span>
                <ImportanceDots value={topic.importance[`tier${t.key}`]} label={t.key} />
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">0–3: how often that tier tests it (judgment-based).</p>
        </div>
      </div>

      <Section title="How to study it">
        <ol className="grid gap-2 md:grid-cols-3">
          <li className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-medium">1. Watch one good video</p>
            <div className="flex flex-wrap gap-2">
              {videoLinks(topic.name).map((v) => (
                <a key={v.url} href={v.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs hover:bg-card-hover">
                  <PlayCircleIcon className="size-3.5 text-hard" /> {v.label}
                </a>
              ))}
            </div>
          </li>
          <li className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-medium">2. Code the video&apos;s 1–2 problems yourself</p>
            <p className="mt-1 text-xs text-muted-foreground">Video closed. If you can&apos;t, rewatch only the idea, then try again.</p>
          </li>
          <li className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-medium">3. Easy → Medium → Hard</p>
            <p className="mt-1 text-xs text-muted-foreground">
              25–30 min alone each. Stuck: ask AI for a hint, not code. Needed help? Re-solve it the next day.
            </p>
            <a href={leetcodeTagUrl(id)} target="_blank" rel="noreferrer noopener" className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:underline">
              LeetCode list for this topic <ExternalLinkIcon className="size-3" />
            </a>
          </li>
        </ol>
        {triggers.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
              <LightbulbIcon className="size-4 text-medium" /> Spot the pattern
            </p>
            <ul className="flex flex-col gap-1.5 text-sm">
              {triggers.map((t) => (
                <li key={t.trigger}>
                  <span className="text-muted-foreground">“{t.trigger}”</span> → <span className="text-accent">{t.pattern}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Section title={`Suggested problems (${solvedSuggested}/${suggested.length} done)`}>
          <ul className="flex flex-col gap-1.5">
            {suggested.map((c) => {
              const done = d.solvedSlugs.has(c.slug);
              return (
                <li key={c.slug}>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={cn("flex items-start gap-3 rounded-lg border bg-card px-3 py-2 hover:bg-card-hover", done ? "border-easy/30" : "border-border")}
                  >
                    {done ? <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-easy" /> : <CircleIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
                    <span className="num w-10 shrink-0 text-xs text-muted-foreground">{c.lcNumber}</span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-sm", done && "text-muted-foreground")}>{c.title}</span>
                      {done && <span className="block text-xs text-muted-foreground">Idea: {c.keyIdea}</span>}
                    </span>
                    <DifficultyBadge difficulty={c.difficulty} short />
                  </a>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted-foreground">The key idea shows only after you solve it, so you think first.</p>
        </Section>

        <div className="flex flex-col gap-6">
          <Section title={`Your solves (${mine.length})`}>
            {mine.length ? (
              <ul className="flex flex-col gap-1.5">
                {mine.slice(0, 30).map((s) => (
                  <li key={s.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{s.title}</span>
                    <DifficultyBadge difficulty={s.difficulty} short />
                    <SourceBadge source={s.source} />
                  </li>
                ))}
                {mine.length > 30 && (
                  <Link href={`/solved?topic=${id}`} className="text-xs text-accent hover:underline">
                    See all {mine.length}
                  </Link>
                )}
              </ul>
            ) : (
              <EmptyState title="Nothing yet" description="Solve any problem on this topic and it appears here." className="py-6" />
            )}
          </Section>

          <Section title="Day by day">
            <ol className="flex flex-col gap-2">
              {days.map((x) => (
                <li key={x.date} className={cn("rounded-xl border bg-card p-3", x.date === d.today ? "border-accent/60" : "border-border")}>
                  <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="num">{formatDate(x.date, "EEE d MMM")}</span>
                    <span>·</span>
                    <span>{STEP_LABEL[x.step]}</span>
                    <span className="num ml-auto">
                      {x.target.easy}E {x.target.medium}M {x.target.hard}H
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">{x.focus}</p>
                </li>
              ))}
            </ol>
          </Section>
        </div>
      </div>
    </div>
  );
}
