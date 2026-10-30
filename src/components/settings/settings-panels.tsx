"use client";

import { useRef, useState, useTransition } from "react";
import {
  AlertTriangleIcon,
  DownloadIcon,
  FileJsonIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  LogOutIcon,
  UploadIcon,
} from "lucide-react";
import { toast } from "sonner";
import { logoutAction } from "@/server/actions/auth";
import { importBackup, previewBackup, resetAllProgress } from "@/server/actions/backup";
import { updateSettings } from "@/server/actions/settings";
import { addDays, formatDate } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div>
        <h2 className="font-medium">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function PlanSettings({ startDate, dailyHours, planDays }: { startDate: string; dailyHours: number; planDays: number }) {
  const [start, setStart] = useState(startDate);
  const [hours, setHours] = useState(String(dailyHours));
  const [pending, startTransition] = useTransition();
  const shifted = start !== startDate;
  const validStart = /^\d{4}-\d{2}-\d{2}$/.test(start);

  function save(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateSettings({ startDate: start, dailyHours: Number(hours) });
      if (res.ok) toast.success(shifted ? "Start date changed: every plan date has shifted" : "Settings saved");
      else toast.error(res.error);
    });
  }

  return (
    <Panel title="Plan" description="Day N of the plan = start date + N. Changing the start date shifts every schedule date.">
      <form onSubmit={save} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="start">Start date</Label>
            <Input id="start" type="date" required value={start} onChange={(e) => setStart(e.target.value)} className="num" />
            {validStart && (
              <p className="text-xs text-muted-foreground">
                Ends {formatDate(addDays(start, planDays - 1), "EEE d MMM yyyy")} ({planDays} days)
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="hours">Daily study hours</Label>
            <Input id="hours" type="number" min={1} max={16} required value={hours} onChange={(e) => setHours(e.target.value)} className="num" />
          </div>
        </div>
        {shifted && (
          <p role="alert" className="flex items-start gap-2 rounded-lg border border-medium/30 bg-medium/10 p-3 text-sm">
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-medium" />
            Saving shifts the whole plan: every schedule date, Today, and the Dashboard’s plan curve and ahead/behind will move.
            Day logs stay attached to their day number.
          </p>
        )}
        <Button type="submit" className="self-start" disabled={pending}>
          Save
        </Button>
      </form>
    </Panel>
  );
}

export function ExportPanel() {
  const items = [
    { href: "/api/export/json", label: "JSON backup", sub: "Every table. Use this to restore.", icon: FileJsonIcon },
    { href: "/api/export/xlsx", label: "Excel (.xlsx)", sub: "Dashboard, Problems, Schedule, Mistakes, Mocks", icon: FileSpreadsheetIcon },
    { href: "/api/export/csv", label: "CSV", sub: "Problems only", icon: FileTextIcon },
  ];
  return (
    <Panel title="Export" description="Download a JSON backup weekly and keep it somewhere safe.">
      <ul className="grid gap-2 sm:grid-cols-3">
        {items.map((i) => (
          <li key={i.href}>
            <a
              href={i.href}
              download
              onClick={() => toast.success(`Preparing ${i.label}…`)}
              className="flex h-full flex-col gap-1 rounded-lg border border-border p-3 transition-colors hover:bg-card-hover"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <i.icon className="size-4 text-accent" /> {i.label}
                <DownloadIcon className="ml-auto size-3.5 text-muted-foreground" />
              </span>
              <span className="text-xs text-muted-foreground">{i.sub}</span>
            </a>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

type Preview = {
  exportedAt: string;
  startDate: string;
  problems: number;
  custom: number;
  withProgress: number;
  solved: number;
  dayLogs: number;
  events: number;
  mistakes: number;
  mocks: number;
};

export function ImportPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [pending, startTransition] = useTransition();

  async function onFile(file: File | undefined) {
    if (!file) return;
    const t = await file.text();
    startTransition(async () => {
      const res = await previewBackup({ text: t });
      if (res.ok) {
        setText(t);
        setPreview(res.data);
      } else {
        toast.error(res.error);
        if (fileRef.current) fileRef.current.value = "";
      }
    });
  }

  function close() {
    setPreview(null);
    setText(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function restore() {
    if (!text) return;
    startTransition(async () => {
      const res = await importBackup({ text });
      if (res.ok) {
        toast.success(`Restored progress for ${res.data.restored} problems${res.data.skipped ? ` (${res.data.skipped} skipped)` : ""}`);
        close();
      } else toast.error(res.error);
    });
  }

  return (
    <Panel title="Import backup" description="Restore from a JSON backup. This replaces all current progress, logs, mistakes and mocks.">
      <div>
        <input
          ref={fileRef}
          id="backup-file"
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <Button variant="secondary" disabled={pending} onClick={() => fileRef.current?.click()}>
          <UploadIcon /> Choose backup file…
        </Button>
      </div>
      <Dialog open={!!preview} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore this backup?</DialogTitle>
            <DialogDescription>
              Exported {preview ? new Date(preview.exportedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : ""}. Current
              progress will be replaced.
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <Count label="Start date" value={formatDate(preview.startDate)} />
              <Count label="Problems" value={`${preview.problems} (${preview.custom} custom)`} />
              <Count label="With progress" value={preview.withProgress} />
              <Count label="Solved / revised" value={preview.solved} />
              <Count label="Day logs" value={preview.dayLogs} />
              <Count label="Activity events" value={preview.events} />
              <Count label="Mistakes" value={preview.mistakes} />
              <Count label="Mocks" value={preview.mocks} />
            </dl>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button onClick={restore} disabled={pending}>
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

function Count({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="num font-medium">{value}</dd>
    </div>
  );
}

export function DangerPanel() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();

  function reset() {
    startTransition(async () => {
      const res = await resetAllProgress({ confirm });
      if (res.ok) {
        toast.success("Progress reset. Plan data kept.");
        setOpen(false);
        setConfirm("");
      } else toast.error(res.error);
    });
  }

  return (
    <Panel title="Account">
      <div className="flex flex-wrap gap-2">
        <form action={logoutAction}>
          <Button type="submit" variant="secondary">
            <LogOutIcon /> Log out
          </Button>
        </form>
        <Button variant="outline" className="border-hard/40 text-hard hover:bg-hard/10" onClick={() => setOpen(true)}>
          <AlertTriangleIcon /> Reset progress…
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset all progress?</DialogTitle>
            <DialogDescription>
              Clears every status, date, time, note and redo date, plus activity, day logs, mistakes and mocks. Topics, problems
              and the schedule stay. Export a JSON backup first.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-reset">
              Type <span className="num font-semibold">RESET</span> to confirm
            </Label>
            <Input id="confirm-reset" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" className="num" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={confirm !== "RESET" || pending} onClick={reset}>
              Reset progress
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
