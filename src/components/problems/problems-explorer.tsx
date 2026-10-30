"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import type { Difficulty, Status } from "@/db/schema";
import { DIFFICULTIES, DIFFICULTY_LABEL, STATUS_CLASS, STATUS_LABEL, STATUSES } from "@/lib/constants";
import { computeRedoState, isDone } from "@/lib/metrics";
import type { ProblemDTO } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/app-context";
import { SEARCH_INPUT_ID } from "@/components/layout/shortcuts";
import { EmptyState } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProblemList } from "./problem-list";

const SORTS = {
  plan: "Plan order",
  difficulty: "Difficulty",
  solved: "Date solved",
  time: "Time spent",
} as const;
type SortKey = keyof typeof SORTS;

const select =
  "h-9 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

const DIFF_RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

export function ProblemsExplorer({ problems }: { problems: ProblemDTO[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { topics, today } = useApp();
  const searchRef = useRef<HTMLInputElement>(null);

  const q = params.get("q") ?? "";
  const topic = params.get("topic") ?? "";
  const difficulty = params.get("difficulty") ?? "";
  const status = params.get("status") ?? "";
  const redo = params.get("redo") === "1";
  const due = params.get("due") === "1";
  const custom = params.get("custom") === "1";
  const sort = (params.get("sort") ?? "plan") as SortKey;

  const [query, setQuery] = useState(q);

  function setParams(next: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "" || (k === "sort" && v === "plan")) sp.delete(k);
      else sp.set(k, v);
    }
    sp.delete("focus");
    const s = sp.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  }

  // Debounce search → URL
  useEffect(() => {
    if (query === q) return;
    const t = window.setTimeout(() => setParams({ q: query || null }), 200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    if (params.get("focus") === "1") searchRef.current?.focus();
  }, [params]);

  const needle = q.trim().toLowerCase().replace(/^lc\s*/, "");
  const filtered = problems.filter((p) => {
    if (needle && !(p.title.toLowerCase().includes(needle) || String(p.lcNumber ?? "").startsWith(needle))) return false;
    if (topic && p.topicId !== topic) return false;
    if (difficulty && p.difficulty !== difficulty) return false;
    if (status && p.status !== status) return false;
    if (redo && !p.redoFlag) return false;
    if (due && !computeRedoState(p, today).isDue) return false;
    if (custom && !p.isCustom) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case "difficulty":
        return DIFF_RANK[b.difficulty] - DIFF_RANK[a.difficulty] || a.order - b.order;
      case "solved":
        return (b.solvedAt ?? "").localeCompare(a.solvedAt ?? "") || a.order - b.order;
      case "time":
        return (b.timeMinutes ?? -1) - (a.timeMinutes ?? -1) || a.order - b.order;
      default:
        return Number(a.isCustom) - Number(b.isCustom) || a.order - b.order;
    }
  });

  const counts = {
    total: filtered.length,
    done: filtered.filter(isDone).length,
    byStatus: Object.fromEntries(STATUSES.map((s) => [s, filtered.filter((p) => p.status === s).length])) as Record<Status, number>,
    byDiff: Object.fromEntries(DIFFICULTIES.map((d) => [d, filtered.filter((p) => p.difficulty === d).length])) as Record<Difficulty, number>,
  };

  const anyFilter = !!(q || topic || difficulty || status || redo || due || custom);

  return (
    <div className="flex flex-col gap-4">
      {/* Summary */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-card px-4 py-3 text-sm">
        <span>
          <span className="num font-semibold">{counts.done}</span>
          <span className="text-muted-foreground">/{counts.total} solved</span>
        </span>
        <span className="hidden h-4 w-px bg-border sm:block" />
        {STATUSES.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5 text-xs">
            <span className={cn("size-1.5 rounded-full", STATUS_CLASS[s].dot)} />
            <span className="text-muted-foreground">{STATUS_LABEL[s]}</span>
            <span className="num">{counts.byStatus[s]}</span>
          </span>
        ))}
        <span className="hidden h-4 w-px bg-border sm:block" />
        {DIFFICULTIES.map((d) => (
          <span key={d} className="num text-xs">
            <span className={cn(d === "easy" ? "text-easy" : d === "medium" ? "text-medium" : "text-hard")}>
              {DIFFICULTY_LABEL[d][0]}
            </span>{" "}
            {counts.byDiff[d]}
          </span>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={SEARCH_INPUT_ID}
            ref={searchRef}
            type="search"
            placeholder="Search title or LC number…  (press / )"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            aria-label="Search problems"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <select aria-label="Filter by topic" className={cn(select, "col-span-2 sm:w-56")} value={topic} onChange={(e) => setParams({ topic: e.target.value })}>
            <option value="">All topics</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.order}. {t.name}
              </option>
            ))}
          </select>
          <select aria-label="Filter by difficulty" className={select} value={difficulty} onChange={(e) => setParams({ difficulty: e.target.value })}>
            <option value="">All difficulties</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {DIFFICULTY_LABEL[d]}
              </option>
            ))}
          </select>
          <select aria-label="Filter by status" className={select} value={status} onChange={(e) => setParams({ status: e.target.value })}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <select aria-label="Sort by" className={select} value={sort} onChange={(e) => setParams({ sort: e.target.value })}>
            {Object.entries(SORTS).map(([k, v]) => (
              <option key={k} value={k}>
                Sort: {v}
              </option>
            ))}
          </select>
          <div className="col-span-2 flex flex-wrap items-center gap-1.5">
            <Toggle on={redo} onClick={() => setParams({ redo: redo ? null : "1" })}>
              ★ Starred
            </Toggle>
            <Toggle on={due} onClick={() => setParams({ due: due ? null : "1" })}>
              Redo due
            </Toggle>
            <Toggle on={custom} onClick={() => setParams({ custom: custom ? null : "1" })}>
              Custom
            </Toggle>
            {anyFilter && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setQuery("");
                  router.replace(sort === "plan" ? pathname : `${pathname}?sort=${sort}`, { scroll: false });
                }}
              >
                <XIcon /> Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      <ProblemList
        problems={problems}
        visibleIds={sorted.map((p) => p.id)}
        options={{ statusVariant: "compact", showTopic: !topic, keyIdea: "reveal" }}
        empty={<EmptyState icon={<SearchIcon />} title="No problems match" description="Try clearing a filter." />}
      />
    </div>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "h-8 rounded-lg border px-3 text-xs font-medium transition-colors duration-150",
        on ? "border-accent/50 bg-accent/10 text-foreground" : "border-border text-muted-foreground hover:bg-card-hover hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
