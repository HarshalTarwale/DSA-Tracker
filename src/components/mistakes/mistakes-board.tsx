"use client";

import { useOptimistic, useState, useTransition } from "react";
import { CheckIcon, ChevronsUpDownIcon, FileWarningIcon, PencilIcon, PlusIcon, SearchIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import {
  createMistake,
  deleteMistake,
  toggleMistakeResolved,
  updateMistake,
  type MistakeInput,
} from "@/server/actions/mistakes";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { MistakeDTO } from "@/server/queries/journal";
import { useApp, useTopicName } from "@/components/app-context";
import { EmptyState } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";

export interface ProblemOption {
  id: number;
  lcNumber: number | null;
  title: string;
  topicId: string;
}

const select =
  "h-9 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

type Opt = { kind: "toggle"; id: number; resolved: boolean } | { kind: "delete"; id: number };

export function MistakesBoard({ mistakes, problems }: { mistakes: MistakeDTO[]; problems: ProblemOption[] }) {
  const { topics } = useApp();
  const topicName = useTopicName();
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState("");
  const [editing, setEditing] = useState<MistakeDTO | "new" | null>(null);
  const [, startTransition] = useTransition();
  const [list, apply] = useOptimistic(mistakes, (s: MistakeDTO[], a: Opt) =>
    a.kind === "delete" ? s.filter((m) => m.id !== a.id) : s.map((m) => (m.id === a.id ? { ...m, resolved: a.resolved } : m)),
  );
  const byId = new Map(problems.map((p) => [p.id, p]));
  const title = (m: MistakeDTO) => (m.problemId ? (byId.get(m.problemId)?.title ?? m.problemTitle) : m.problemTitle) ?? "Untitled";

  const needle = q.trim().toLowerCase();
  const filtered = list.filter((m) => {
    if (topic && m.topicId !== topic) return false;
    if (!needle) return true;
    return [title(m), m.trigger, m.whatWentWrong, m.correctIdea].some((t) => t?.toLowerCase().includes(needle));
  });

  function toggle(m: MistakeDTO) {
    startTransition(async () => {
      apply({ kind: "toggle", id: m.id, resolved: !m.resolved });
      const res = await toggleMistakeResolved({ id: m.id, resolved: !m.resolved });
      if (res.ok) toast.success(!m.resolved ? "Marked re-solved" : "Marked not re-solved");
      else toast.error(res.error);
    });
  }

  function remove(m: MistakeDTO) {
    startTransition(async () => {
      apply({ kind: "delete", id: m.id });
      const res = await deleteMistake({ id: m.id });
      if (res.ok) toast.success("Entry deleted");
      else toast.error(res.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search mistakes…" className="pl-9" aria-label="Search mistakes" />
        </div>
        <select aria-label="Filter by topic" className={cn(select, "sm:w-56")} value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option value="">All topics</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.order}. {t.name}
            </option>
          ))}
        </select>
        <Button onClick={() => setEditing("new")}>
          <PlusIcon /> Log a mistake
        </Button>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col gap-3">
          <EmptyState
            icon={<FileWarningIcon />}
            title="Your pattern notebook is empty"
            description="After each miss, write the trigger words, what went wrong and the correct idea in one line. Re-read it before mocks."
            action={
              <Button onClick={() => setEditing("new")}>
                <PlusIcon /> Log your first mistake
              </Button>
            }
          />
          <p className="section-title">Example entry</p>
          <MistakeCard
            m={{
              id: 0,
              date: "2026-11-05",
              problemId: null,
              problemTitle: "Two Sum",
              topicId: "hashing",
              trigger: "find a pair with target",
              whatWentWrong: "Wrote the O(n²) double loop; didn’t think of storing what I’ve seen.",
              correctIdea: "Store complement in a dict: for each x, check target − x in seen, then add x.",
              resolved: true,
            }}
            title="Two Sum (example)"
            topicLabel="Hashing"
            example
          />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<SearchIcon />} title="No entries match" description="Try another search or topic." />
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((m) => (
            <li key={m.id}>
              <MistakeCard
                m={m}
                title={title(m)}
                topicLabel={topicName(m.topicId)}
                onToggle={() => toggle(m)}
                onEdit={() => setEditing(m)}
                onDelete={() => remove(m)}
              />
            </li>
          ))}
        </ul>
      )}

      <MistakeDialog
        key={editing === "new" ? "new" : (editing?.id ?? "closed")}
        open={editing !== null}
        initial={editing === "new" ? null : editing}
        problems={problems}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

function MistakeCard({
  m,
  title,
  topicLabel,
  onToggle,
  onEdit,
  onDelete,
  example = false,
}: {
  m: MistakeDTO;
  title: string;
  topicLabel: string;
  onToggle?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  example?: boolean;
}) {
  return (
    <article className={cn("flex flex-col gap-3 rounded-xl border border-border bg-card p-4", example && "border-dashed opacity-80")}>
      <header className="flex flex-wrap items-center gap-2">
        <span className="num text-xs text-muted-foreground">{formatDate(m.date, "d MMM yyyy")}</span>
        <span className="font-medium">{title}</span>
        {topicLabel && <span className="rounded-md bg-card-hover px-1.5 py-0.5 text-xs text-muted-foreground">{topicLabel}</span>}
        <div className="ml-auto flex items-center gap-1">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Checkbox checked={m.resolved} onCheckedChange={onToggle} disabled={example} aria-label="Re-solved" />
            Re-solved
          </label>
          {!example && (
            <>
              <Button size="icon-sm" variant="ghost" onClick={onEdit} aria-label="Edit entry">
                <PencilIcon className="text-muted-foreground" />
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={onDelete} aria-label="Delete entry">
                <Trash2Icon className="text-muted-foreground" />
              </Button>
            </>
          )}
        </div>
      </header>
      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <Field label="Pattern / trigger" value={m.trigger} />
        <Field label="What went wrong" value={m.whatWentWrong} />
        <Field label="Correct idea" value={m.correctIdea} accent />
      </dl>
    </article>
  );
}

function Field({ label, value, accent }: { label: string; value: string | null; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("leading-relaxed whitespace-pre-line", accent && "text-easy")}>{value || "–"}</dd>
    </div>
  );
}

function MistakeDialog({
  open,
  initial,
  problems,
  onClose,
}: {
  open: boolean;
  initial: MistakeDTO | null;
  problems: ProblemOption[];
  onClose: () => void;
}) {
  const { today, topics } = useApp();
  const [pending, startTransition] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [f, setF] = useState<MistakeInput>({
    date: initial?.date ?? today,
    problemId: initial?.problemId ?? null,
    problemTitle: initial?.problemTitle ?? "",
    topicId: initial?.topicId ?? null,
    trigger: initial?.trigger ?? "",
    whatWentWrong: initial?.whatWentWrong ?? "",
    correctIdea: initial?.correctIdea ?? "",
    resolved: initial?.resolved ?? false,
  });
  const picked = f.problemId ? problems.find((p) => p.id === f.problemId) : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const data = { ...f, problemTitle: picked ? picked.title : f.problemTitle };
      const res = initial ? await updateMistake({ id: initial.id, data }) : await createMistake(data);
      if (res.ok) {
        toast.success(initial ? "Entry updated" : "Mistake logged");
        onClose();
      } else toast.error(res.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit entry" : "Log a mistake"}</DialogTitle>
          <DialogDescription>One entry per miss. Keep the correct idea to one line.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-[9rem_1fr]">
            <div className="flex flex-col gap-2">
              <Label htmlFor="m-date">Date</Label>
              <Input id="m-date" type="date" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className="num" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Problem</Label>
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" role="combobox" aria-expanded={pickerOpen} className="justify-between font-normal">
                    <span className="truncate">
                      {picked ? `${picked.lcNumber ?? ""} ${picked.title}`.trim() : f.problemTitle || "Pick a problem or type one…"}
                    </span>
                    <ChevronsUpDownIcon className="opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[min(28rem,calc(100vw-2rem))] p-0" align="start">
                  <ProblemPicker
                    problems={problems}
                    selectedId={f.problemId}
                    onPick={(p) => {
                      setF({ ...f, problemId: p.id, problemTitle: p.title, topicId: p.topicId });
                      setPickerOpen(false);
                    }}
                    onFreeText={(text) => {
                      setF({ ...f, problemId: null, problemTitle: text });
                      setPickerOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="m-topic">Topic</Label>
            <select
              id="m-topic"
              className={select}
              value={f.topicId ?? ""}
              onChange={(e) => setF({ ...f, topicId: e.target.value || null })}
            >
              <option value="">—</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.order}. {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="m-trigger">Pattern / trigger words</Label>
            <Input id="m-trigger" value={f.trigger ?? ""} onChange={(e) => setF({ ...f, trigger: e.target.value })} placeholder="e.g. “find a pair with target”" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="m-wrong">What went wrong</Label>
            <Textarea id="m-wrong" rows={3} value={f.whatWentWrong ?? ""} onChange={(e) => setF({ ...f, whatWentWrong: e.target.value })} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="m-idea">Correct idea (one line)</Label>
            <Input id="m-idea" value={f.correctIdea ?? ""} onChange={(e) => setF({ ...f, correctIdea: e.target.value })} placeholder="e.g. store complement in dict" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={f.resolved} onCheckedChange={(v) => setF({ ...f, resolved: v === true })} />
            Re-solved from scratch
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {initial ? "Save" : "Add entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProblemPicker({
  problems,
  selectedId,
  onPick,
  onFreeText,
}: {
  problems: ProblemOption[];
  selectedId: number | null;
  onPick: (p: ProblemOption) => void;
  onFreeText: (text: string) => void;
}) {
  const [search, setSearch] = useState("");
  return (
    <Command>
      <CommandInput placeholder="Search by title or LC #…" value={search} onValueChange={setSearch} />
      <CommandList>
        <CommandEmpty>No match.</CommandEmpty>
        {search.trim() && (
          <CommandGroup heading="Free text">
            <CommandItem value={`__free__ ${search}`} onSelect={() => onFreeText(search.trim())}>
              Use “{search.trim()}”
            </CommandItem>
          </CommandGroup>
        )}
        <CommandGroup heading="Problems">
          {problems.map((p) => (
            <CommandItem key={p.id} value={`${p.lcNumber ?? ""} ${p.title}`} onSelect={() => onPick(p)}>
              <CheckIcon className={cn("size-4", selectedId === p.id ? "opacity-100" : "opacity-0")} />
              <span className="num w-10 text-xs text-muted-foreground">{p.lcNumber ?? "–"}</span>
              <span className="truncate">{p.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
