"use client";

import { useState, useTransition } from "react";
import { CheckIcon, ExternalLinkIcon, LightbulbIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import type { Difficulty, How } from "@/db/schema";
import { deleteCustomProblem } from "@/server/actions/problems";
import { DIFFICULTIES, DIFFICULTY_LABEL, HOW_LABEL, HOWS } from "@/lib/constants";
import { formatDate, relativeDay } from "@/lib/dates";
import { computeRedoState } from "@/lib/metrics";
import type { ProblemPatch } from "@/lib/problem-logic";
import type { ProblemDTO } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useApp, useTopicName } from "@/components/app-context";
import { DifficultyBadge, MasteredBadge } from "@/components/shared/badges";
import { TimerButton } from "@/components/timer/timer-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusSegmented } from "./status-control";

const native =
  "h-9 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

export function EditSheet({
  problem,
  open,
  onOpenChange,
  onSave,
  onRedoDone,
}: {
  problem: ProblemDTO | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (p: ProblemDTO, patch: ProblemPatch) => void;
  onRedoDone: (p: ProblemDTO) => void;
}) {
  return (
    <Sheet open={open && !!problem} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 overflow-y-auto p-0">
        {problem && (
          <EditForm
            key={`${problem.id}:${problem.status}:${problem.redo1DoneAt}:${problem.redo7DoneAt}:${problem.redo30DoneAt}`}
            problem={problem}
            onSave={(patch) => {
              onSave(problem, patch);
              onOpenChange(false);
            }}
            onRedoDone={() => onRedoDone(problem)}
            onDeleted={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function EditForm({
  problem: p,
  onSave,
  onRedoDone,
  onDeleted,
}: {
  problem: ProblemDTO;
  onSave: (patch: ProblemPatch) => void;
  onRedoDone: () => void;
  onDeleted: () => void;
}) {
  const { today, topics } = useApp();
  const topicName = useTopicName();
  const [f, setF] = useState({
    status: p.status,
    solvedAt: p.solvedAt ?? "",
    how: p.how ?? "",
    timeMinutes: p.timeMinutes?.toString() ?? "",
    redoFlag: p.redoFlag,
    redo1DoneAt: p.redo1DoneAt ?? "",
    redo7DoneAt: p.redo7DoneAt ?? "",
    redo30DoneAt: p.redo30DoneAt ?? "",
    notes: p.notes ?? "",
    title: p.title,
    lcNumber: p.lcNumber?.toString() ?? "",
    url: p.url ?? "",
    difficulty: p.difficulty,
    topicId: p.topicId,
    keyIdea: p.keyIdea ?? "",
  });
  const [showIdea, setShowIdea] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startDelete] = useTransition();
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  const redo = computeRedoState(
    { ...p, solvedAt: f.solvedAt || null, redoFlag: f.redoFlag, redo1DoneAt: f.redo1DoneAt || null, redo7DoneAt: f.redo7DoneAt || null, redo30DoneAt: f.redo30DoneAt || null },
    today,
  );

  function buildPatch(): ProblemPatch | null {
    const patch: ProblemPatch = {};
    const nul = (s: string) => (s.trim() === "" ? null : s.trim());
    if (f.status !== p.status) patch.status = f.status;
    if (nul(f.solvedAt) !== p.solvedAt) patch.solvedAt = nul(f.solvedAt);
    if ((f.how || null) !== p.how) patch.how = (f.how || null) as How | null;
    const t = f.timeMinutes.trim() === "" ? null : Math.round(Number(f.timeMinutes));
    if (t !== null && (!Number.isFinite(t) || t < 0)) {
      toast.error("Time must be a positive number of minutes");
      return null;
    }
    if (t !== p.timeMinutes) patch.timeMinutes = t;
    if (f.redoFlag !== p.redoFlag) patch.redoFlag = f.redoFlag;
    if (nul(f.redo1DoneAt) !== p.redo1DoneAt) patch.redo1DoneAt = nul(f.redo1DoneAt);
    if (nul(f.redo7DoneAt) !== p.redo7DoneAt) patch.redo7DoneAt = nul(f.redo7DoneAt);
    if (nul(f.redo30DoneAt) !== p.redo30DoneAt) patch.redo30DoneAt = nul(f.redo30DoneAt);
    if (nul(f.notes) !== p.notes) patch.notes = nul(f.notes);
    if (p.isCustom) {
      if (f.title.trim() && f.title.trim() !== p.title) patch.title = f.title.trim();
      const lc = f.lcNumber.trim() === "" ? null : Number(f.lcNumber);
      if (lc !== null && (!Number.isInteger(lc) || lc <= 0)) {
        toast.error("LC number must be a positive whole number");
        return null;
      }
      if (lc !== p.lcNumber) patch.lcNumber = lc;
      if (nul(f.url) !== p.url) patch.url = nul(f.url);
      if (f.difficulty !== p.difficulty) patch.difficulty = f.difficulty;
      if (f.topicId !== p.topicId) patch.topicId = f.topicId;
      if (nul(f.keyIdea) !== p.keyIdea) patch.keyIdea = nul(f.keyIdea);
    }
    return patch;
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    const patch = buildPatch();
    if (!patch) return;
    if (Object.keys(patch).length === 0) {
      toast("No changes");
      return;
    }
    onSave(patch);
  }

  function remove() {
    startDelete(async () => {
      const res = await deleteCustomProblem({ id: p.id });
      if (res.ok) {
        toast.success(`Deleted “${p.title}”`);
        onDeleted();
      } else toast.error(res.error);
    });
  }

  return (
    <form onSubmit={save} className="flex min-h-full flex-col">
      <SheetHeader className="border-b border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="num">{p.lcNumber ? `LC ${p.lcNumber}` : "Custom"}</span>
          <span>·</span>
          <span className="truncate">{topicName(p.topicId)}</span>
        </div>
        <SheetTitle className="text-lg leading-snug">{p.title}</SheetTitle>
        <SheetDescription className="sr-only">Edit every field of this problem</SheetDescription>
        <div className="flex flex-wrap items-center gap-2">
          <DifficultyBadge difficulty={p.difficulty} />
          {redo.mastered && <MasteredBadge />}
          {p.url && (
            <a
              href={p.url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
            >
              Open on LeetCode <ExternalLinkIcon className="size-3" />
            </a>
          )}
          <div className="ml-auto">
            <TimerButton problemId={p.id} title={p.title} />
          </div>
        </div>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-5 p-4">
        {!p.isCustom && p.keyIdea && (
          <div className="rounded-lg border border-border bg-card p-3 text-sm">
            {showIdea ? (
              <p>
                <LightbulbIcon className="mr-1.5 inline size-3.5 text-medium" />
                {p.keyIdea}
              </p>
            ) : (
              <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setShowIdea(true)}>
                <LightbulbIcon className="mr-1.5 inline size-3.5" />
                Reveal key idea / pattern
              </button>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label>Status</Label>
          <StatusSegmented value={f.status} onChange={(s) => set("status", s)} label={p.title} className="w-full" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="solvedAt">Date solved</Label>
            <Input id="solvedAt" type="date" value={f.solvedAt} onChange={(e) => set("solvedAt", e.target.value)} className="num" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="time">Time (min)</Label>
            <Input
              id="time"
              type="number"
              inputMode="numeric"
              min={0}
              value={f.timeMinutes}
              onChange={(e) => set("timeMinutes", e.target.value)}
              className="num"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="how">How</Label>
            <select
              id="how"
              value={f.how}
              onChange={(e) => {
                const how = e.target.value;
                setF((s) => ({ ...s, how, redoFlag: how === "hint" || how === "solution" ? true : s.redoFlag }));
              }}
              className={native}
            >
              <option value="">—</option>
              {HOWS.map((h) => (
                <option key={h} value={h}>
                  {HOW_LABEL[h]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="redoFlag">Redo flag</Label>
            <div className="flex h-9 items-center gap-2">
              <Switch id="redoFlag" checked={f.redoFlag} onCheckedChange={(v) => set("redoFlag", v)} />
              <span className="text-xs text-muted-foreground">{f.redoFlag ? "Starred" : "Off"}</span>
            </div>
          </div>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Redo timeline</legend>
          {!redo.stages ? (
            <p className="text-sm text-muted-foreground">Set a date solved to schedule redos at +1, +7 and +30 days.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {redo.stages.map((s) => {
                const key = s.stage === 1 ? "redo1DoneAt" : s.stage === 7 ? "redo7DoneAt" : "redo30DoneAt";
                const isNext = redo.nextStage === s.stage;
                const late = isNext && s.dueDate < today;
                return (
                  <li
                    key={s.stage}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border border-border p-2.5",
                      isNext && f.redoFlag && "border-accent/40",
                    )}
                  >
                    <span
                      className={cn(
                        "num flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                        s.doneAt ? "bg-status-revised/15 text-status-revised" : "bg-card-hover text-muted-foreground",
                      )}
                    >
                      {s.doneAt ? <CheckIcon className="size-4" /> : `+${s.stage}`}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-xs text-muted-foreground">
                        Due <span className="num text-foreground">{formatDate(s.dueDate, "d MMM")}</span>{" "}
                        <span className={cn(late && "text-hard")}>({relativeDay(s.dueDate, today)})</span>
                      </span>
                      <Input
                        type="date"
                        aria-label={`Redo +${s.stage} done date`}
                        value={f[key]}
                        onChange={(e) => set(key, e.target.value)}
                        className="num mt-1 h-8 text-xs"
                      />
                    </div>
                    {isNext && !s.doneAt && (
                      <Button type="button" size="sm" variant="secondary" onClick={onRedoDone}>
                        Redo done
                      </Button>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </fieldset>

        <div className="flex flex-col gap-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            rows={4}
            value={f.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Edge cases, the trick you missed, complexity…"
          />
        </div>

        {p.isCustom && (
          <fieldset className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <legend className="px-1 text-sm font-medium">Problem details (custom)</legend>
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={f.title} onChange={(e) => set("title", e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="lc">LC #</Label>
                <Input id="lc" inputMode="numeric" value={f.lcNumber} onChange={(e) => set("lcNumber", e.target.value)} className="num" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <select
                  id="difficulty"
                  value={f.difficulty}
                  onChange={(e) => set("difficulty", e.target.value as Difficulty)}
                  className={native}
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {DIFFICULTY_LABEL[d]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="topic">Topic</Label>
              <select id="topic" value={f.topicId} onChange={(e) => set("topicId", e.target.value)} className={native}>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.order}. {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="url">URL</Label>
              <Input id="url" type="url" value={f.url} onChange={(e) => set("url", e.target.value)} placeholder="https://leetcode.com/problems/…" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="keyIdea">Key idea</Label>
              <Input id="keyIdea" value={f.keyIdea} onChange={(e) => set("keyIdea", e.target.value)} />
            </div>
            <Button type="button" variant="ghost" className="self-start text-hard hover:text-hard" onClick={() => setConfirmDelete(true)}>
              <Trash2Icon /> Delete problem
            </Button>
          </fieldset>
        )}
      </div>

      <div className="sticky bottom-0 flex gap-2 border-t border-border bg-surface p-4">
        <Button type="submit" className="flex-1">
          Save changes
        </Button>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{p.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the custom problem and its activity history. Mistake-log entries keep their text.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove} disabled={deleting}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
