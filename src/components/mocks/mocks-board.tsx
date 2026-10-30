"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { FlagIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { createMock, deleteMock, updateMock, type MockInput } from "@/server/actions/mocks";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { MockDTO } from "@/server/queries/journal";
import { useApp, useTopicName } from "@/components/app-context";
import { EmptyState } from "@/components/shared/page";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

const MockChart = dynamic(() => import("./mock-chart"), {
  ssr: false,
  loading: () => <Skeleton className="h-[220px] w-full" />,
});

export function MocksBoard({ mocks, suggestedTitle }: { mocks: MockDTO[]; suggestedTitle: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const topicName = useTopicName();
  const [editing, setEditing] = useState<MockDTO | "new" | null>(params.get("new") === "1" ? "new" : null);
  const [, startTransition] = useTransition();
  const [list, removeOptimistic] = useOptimistic(mocks, (s: MockDTO[], id: number) => s.filter((m) => m.id !== id));

  function close() {
    setEditing(null);
    if (params.get("new")) router.replace(pathname, { scroll: false });
  }

  function remove(m: MockDTO) {
    if (!window.confirm(`Delete “${m.title}”?`)) return;
    startTransition(async () => {
      removeOptimistic(m.id);
      const res = await deleteMock({ id: m.id });
      if (res.ok) toast.success("Mock deleted");
      else toast.error(res.error);
    });
  }

  const points = list.map((m) => ({
    key: `${m.date}#${m.id}`,
    date: m.date,
    title: m.title,
    rate: m.attempted ? Math.round((m.solved / m.attempted) * 100) : 0,
  }));
  const totalA = list.reduce((s, m) => s + m.attempted, 0);
  const totalS = list.reduce((s, m) => s + m.solved, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {list.length ? (
            <>
              <span className="num text-foreground">{list.length}</span> mocks · overall{" "}
              <span className="num text-foreground">{totalA ? Math.round((totalS / totalA) * 100) : 0}%</span> solved (
              <span className="num">{totalS}/{totalA}</span>)
            </>
          ) : (
            "No mocks logged yet."
          )}
        </p>
        <Button onClick={() => setEditing("new")}>
          <PlusIcon /> Log a mock
        </Button>
      </div>

      {list.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="section-title mb-3">Solve rate over time</h2>
          <MockChart data={points} />
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState
          icon={<FlagIcon />}
          title="No mock tests yet"
          description="On mock days: 3 unseen problems in 90 minutes, no hints. Then log how it went here."
          action={
            <Button onClick={() => setEditing("new")}>
              <PlusIcon /> Log a mock
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
            <table className="w-full text-sm">
              <thead className="bg-surface text-xs text-muted-foreground">
                <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
                  <th>Date</th>
                  <th>Title</th>
                  <th>Solved</th>
                  <th>Rate</th>
                  <th>Duration</th>
                  <th>Topics</th>
                  <th>What went wrong</th>
                  <th className="sr-only">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...list].reverse().map((m) => (
                  <tr key={m.id} className="bg-card align-top [&>td]:px-3 [&>td]:py-2">
                    <td className="num whitespace-nowrap">{formatDate(m.date, "d MMM yyyy")}</td>
                    <td className="font-medium">{m.title}</td>
                    <td className="num">
                      {m.solved}/{m.attempted}
                    </td>
                    <td className={cn("num", rateClass(m))}>{m.attempted ? Math.round((m.solved / m.attempted) * 100) : 0}%</td>
                    <td className="num">{m.durationMinutes ? `${m.durationMinutes}m` : "–"}</td>
                    <td className="max-w-48 text-xs text-muted-foreground">{m.topicIds.map(topicName).join(", ") || "–"}</td>
                    <td className="max-w-64 text-xs text-muted-foreground">{m.whatWentWrong || "–"}</td>
                    <td className="whitespace-nowrap">
                      <Button size="icon-sm" variant="ghost" onClick={() => setEditing(m)} aria-label={`Edit ${m.title}`}>
                        <PencilIcon className="text-muted-foreground" />
                      </Button>
                      <Button size="icon-sm" variant="ghost" onClick={() => remove(m)} aria-label={`Delete ${m.title}`}>
                        <Trash2Icon className="text-muted-foreground" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <ul className="flex flex-col gap-2 md:hidden">
            {[...list].reverse().map((m) => (
              <li key={m.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-2">
                  <span className="num text-xs text-muted-foreground">{formatDate(m.date, "d MMM")}</span>
                  <span className="flex-1 truncate font-medium">{m.title}</span>
                  <span className={cn("num text-sm", rateClass(m))}>
                    {m.solved}/{m.attempted}
                  </span>
                </div>
                {m.whatWentWrong && <p className="text-xs text-muted-foreground">{m.whatWentWrong}</p>}
                <div className="flex items-center gap-1">
                  <span className="flex-1 truncate text-xs text-muted-foreground">{m.topicIds.map(topicName).join(", ")}</span>
                  <Button size="icon-sm" variant="ghost" onClick={() => setEditing(m)} aria-label={`Edit ${m.title}`}>
                    <PencilIcon className="text-muted-foreground" />
                  </Button>
                  <Button size="icon-sm" variant="ghost" onClick={() => remove(m)} aria-label={`Delete ${m.title}`}>
                    <Trash2Icon className="text-muted-foreground" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <MockDialog
        key={editing === "new" ? "new" : (editing?.id ?? "closed")}
        open={editing !== null}
        initial={editing === "new" ? null : editing}
        suggestedTitle={suggestedTitle}
        onClose={close}
      />
    </div>
  );
}

function rateClass(m: MockDTO) {
  const r = m.attempted ? m.solved / m.attempted : 0;
  return r >= 0.67 ? "text-easy" : r >= 0.34 ? "text-medium" : "text-hard";
}

function MockDialog({
  open,
  initial,
  suggestedTitle,
  onClose,
}: {
  open: boolean;
  initial: MockDTO | null;
  suggestedTitle: string;
  onClose: () => void;
}) {
  const { today, topics } = useApp();
  const [pending, startTransition] = useTransition();
  const [f, setF] = useState({
    date: initial?.date ?? today,
    title: initial?.title ?? suggestedTitle,
    attempted: String(initial?.attempted ?? 3),
    solved: String(initial?.solved ?? 0),
    durationMinutes: String(initial?.durationMinutes ?? 90),
    topicIds: initial?.topicIds ?? ([] as string[]),
    whatWentWrong: initial?.whatWentWrong ?? "",
    notes: initial?.notes ?? "",
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const data: MockInput = {
      date: f.date,
      title: f.title,
      attempted: Number(f.attempted),
      solved: Number(f.solved),
      durationMinutes: f.durationMinutes.trim() ? Number(f.durationMinutes) : null,
      topicIds: f.topicIds,
      whatWentWrong: f.whatWentWrong,
      notes: f.notes,
    };
    startTransition(async () => {
      const res = initial ? await updateMock({ id: initial.id, data }) : await createMock(data);
      if (res.ok) {
        toast.success(initial ? "Mock updated" : "Mock logged");
        onClose();
      } else toast.error(res.error);
    });
  }

  function toggleTopic(id: string) {
    setF((s) => ({ ...s, topicIds: s.topicIds.includes(id) ? s.topicIds.filter((t) => t !== id) : [...s.topicIds, id] }));
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit mock" : "Log a mock test"}</DialogTitle>
          <DialogDescription>Timed, unseen problems, no hints.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-[9rem_1fr]">
            <div className="flex flex-col gap-2">
              <Label htmlFor="k-date">Date</Label>
              <Input id="k-date" type="date" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className="num" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="k-title">Title</Label>
              <Input id="k-title" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="k-att">Attempted</Label>
              <Input id="k-att" type="number" min={0} required value={f.attempted} onChange={(e) => setF({ ...f, attempted: e.target.value })} className="num" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="k-sol">Solved</Label>
              <Input id="k-sol" type="number" min={0} required value={f.solved} onChange={(e) => setF({ ...f, solved: e.target.value })} className="num" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="k-dur">Minutes</Label>
              <Input id="k-dur" type="number" min={0} value={f.durationMinutes} onChange={(e) => setF({ ...f, durationMinutes: e.target.value })} className="num" />
            </div>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">
              Topics covered <span className="num font-normal text-muted-foreground">({f.topicIds.length})</span>
            </legend>
            <div className="grid max-h-40 grid-cols-1 gap-1 overflow-y-auto rounded-lg border border-border p-2 sm:grid-cols-2">
              {topics.map((t) => (
                <label key={t.id} className="flex items-center gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-card-hover">
                  <Checkbox checked={f.topicIds.includes(t.id)} onCheckedChange={() => toggleTopic(t.id)} />
                  <span className="truncate">{t.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-col gap-2">
            <Label htmlFor="k-wrong">What went wrong</Label>
            <Textarea id="k-wrong" rows={2} value={f.whatWentWrong} onChange={(e) => setF({ ...f, whatWentWrong: e.target.value })} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="k-notes">Notes</Label>
            <Textarea id="k-notes" rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {initial ? "Save" : "Log mock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
