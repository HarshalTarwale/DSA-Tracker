"use client";

import { useOptimistic, useState, useTransition } from "react";
import { ExternalLinkIcon, PlusIcon, RefreshCwIcon, SearchIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import type { Difficulty } from "@/db/schema";
import { addManualSolve, deleteManualSolve, setSolveTopic } from "@/server/actions/solves";
import { DIFFICULTIES, DIFFICULTY_LABEL, SOURCE_LABEL } from "@/lib/constants";
import { formatDate, relativeDay } from "@/lib/dates";
import type { SolveDTO } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/app-context";
import { useSync } from "@/components/sync/sync-status";
import { DifficultyBadge, SourceBadge } from "@/components/shared/badges";
import { EmptyState } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const select =
  "h-9 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

type Opt = { kind: "topic"; id: number; topicId: string | null } | { kind: "delete"; id: number };

export function SolvedList({ solves, initialTopic }: { solves: SolveDTO[]; initialTopic?: string }) {
  const { topics, today, sync } = useApp();
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState(initialTopic ?? "");
  const [difficulty, setDifficulty] = useState("");
  const [source, setSource] = useState("");
  const [, startTransition] = useTransition();
  const { busy, syncNow } = useSync();
  const [list, apply] = useOptimistic(solves, (s: SolveDTO[], a: Opt) =>
    a.kind === "delete" ? s.filter((x) => x.id !== a.id) : s.map((x) => (x.id === a.id ? { ...x, topicId: a.topicId, topicLocked: true } : x)),
  );

  const needle = q.trim().toLowerCase();
  const filtered = list.filter((s) => {
    if (topic && (topic === "other" ? s.topicId !== null : s.topicId !== topic)) return false;
    if (difficulty && s.difficulty !== difficulty) return false;
    if (source && s.source !== source) return false;
    if (needle && !(s.title.toLowerCase().includes(needle) || String(s.lcNumber ?? "").startsWith(needle))) return false;
    return true;
  });

  const groups = new Map<string, SolveDTO[]>();
  for (const s of filtered) groups.set(s.solvedDate, [...(groups.get(s.solvedDate) ?? []), s]);

  function changeTopic(s: SolveDTO, topicId: string) {
    startTransition(async () => {
      apply({ kind: "topic", id: s.id, topicId: topicId || null });
      const res = await setSolveTopic({ id: s.id, topicId: topicId || null });
      if (res.ok) toast.success(`“${s.title}” now counts toward ${topics.find((t) => t.id === topicId)?.name ?? "Other"}`);
      else toast.error(res.error);
    });
  }

  function remove(s: SolveDTO) {
    startTransition(async () => {
      apply({ kind: "delete", id: s.id });
      const res = await deleteManualSolve({ id: s.id });
      if (res.ok) toast.success("Removed");
      else toast.error(res.error);
    });
  }

  const byDiff = (d: Difficulty) => filtered.filter((s) => s.difficulty === d).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-card px-4 py-3 text-sm">
        <span>
          <span className="num font-semibold">{filtered.length}</span> <span className="text-muted-foreground">solved</span>
        </span>
        <span className="num text-xs">
          <span className="text-easy">E</span> {byDiff("easy")} · <span className="text-medium">M</span> {byDiff("medium")} ·{" "}
          <span className="text-hard">H</span> {byDiff("hard")}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {sync.connected && (
            <Button size="sm" variant="secondary" onClick={() => !busy && syncNow()} disabled={busy}>
              <RefreshCwIcon className={cn(busy && "animate-spin")} /> {busy ? "Syncing…" : "Sync now"}
            </Button>
          )}
          <AddManual />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <div className="relative col-span-2 sm:flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title or LC #" className="pl-9" aria-label="Search solves" />
        </div>
        <select aria-label="Filter by topic" className={cn(select, "col-span-2 sm:w-56")} value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option value="">All topics</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.order}. {t.name}
            </option>
          ))}
          <option value="other">Other (not DSA)</option>
        </select>
        <select aria-label="Filter by difficulty" className={select} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="">All levels</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {DIFFICULTY_LABEL[d]}
            </option>
          ))}
        </select>
        <select aria-label="Filter by platform" className={select} value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="">All platforms</option>
          {(Object.keys(SOURCE_LABEL) as (keyof typeof SOURCE_LABEL)[]).map((s) => (
            <option key={s} value={s}>
              {SOURCE_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="No solves yet"
          description={
            sync.connected
              ? "Get an Accepted on LeetCode and it appears here automatically (the app syncs when you open it)."
              : "Connect your LeetCode username in Settings and your solves appear here automatically."
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<SearchIcon />} title="Nothing matches" description="Try clearing a filter." />
      ) : (
        <div className="flex flex-col gap-5">
          {[...groups.entries()].map(([date, items]) => (
            <section key={date} className="flex flex-col gap-2">
              <h2 className="section-title">
                {formatDate(date, "EEE d MMM")} <span className="normal-case">· {relativeDay(date, today)}</span>
                <span className="num ml-2 normal-case">{items.length}</span>
              </h2>
              <ul className="flex flex-col gap-1.5">
                {items.map((s) => (
                  <li key={s.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card px-3 py-2.5 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="num w-11 shrink-0 text-xs text-muted-foreground">{s.lcNumber ?? "–"}</span>
                      {s.url ? (
                        <a href={s.url} target="_blank" rel="noreferrer noopener" className="inline-flex min-w-0 items-center gap-1 text-sm font-medium hover:text-accent">
                          <span className="truncate">{s.title}</span>
                          <ExternalLinkIcon className="size-3 shrink-0 opacity-50" />
                        </a>
                      ) : (
                        <span className="truncate text-sm font-medium">{s.title}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <DifficultyBadge difficulty={s.difficulty} short />
                      <SourceBadge source={s.source} />
                      <select
                        aria-label={`Topic for ${s.title}`}
                        title={s.topicLocked ? "Topic set by you" : "Topic detected automatically. Change it if it's wrong."}
                        className={cn(select, "h-8 min-w-0 flex-1 text-xs sm:w-48 sm:flex-none", !s.topicId && "text-muted-foreground")}
                        value={s.topicId ?? ""}
                        onChange={(e) => changeTopic(s, e.target.value)}
                      >
                        <option value="">Other (not DSA)</option>
                        {topics.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      {s.source === "manual" && (
                        <Button size="icon-sm" variant="ghost" onClick={() => remove(s)} aria-label={`Remove ${s.title}`}>
                          <Trash2Icon className="text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function AddManual() {
  const { topics, today } = useApp();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(form: FormData) {
    startTransition(async () => {
      const res = await addManualSolve({
        title: String(form.get("title") ?? ""),
        url: String(form.get("url") ?? "") || null,
        difficulty: String(form.get("difficulty")) as Difficulty,
        topicId: String(form.get("topicId") ?? ""),
        date: String(form.get("date") ?? today),
      });
      if (res.ok) {
        toast.success("Added");
        setOpen(false);
      } else toast.error(res.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <PlusIcon /> Add
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a problem from another site</DialogTitle>
          <DialogDescription>
            Only for GFG, a YouTube video&apos;s problem, etc. LeetCode and HackerRank solves are added automatically.
          </DialogDescription>
        </DialogHeader>
        <form action={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="m-title">Problem name</Label>
            <Input id="m-title" name="title" required maxLength={200} autoFocus />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="m-url">Link (optional)</Label>
            <Input id="m-url" name="url" type="url" placeholder="https://…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="m-diff">Level</Label>
              <select id="m-diff" name="difficulty" defaultValue="medium" className={select}>
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {DIFFICULTY_LABEL[d]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="m-date">Date</Label>
              <Input id="m-date" name="date" type="date" defaultValue={today} max={today} required className="num" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="m-topic">Topic</Label>
            <select id="m-topic" name="topicId" required className={select}>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.order}. {t.name}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
