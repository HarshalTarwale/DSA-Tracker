"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertTriangleIcon, LogOutIcon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import { logoutAction } from "@/server/actions/auth";
import { resetProgress, updateAccounts, updatePlanDates } from "@/server/actions/settings";
import { diffDays, formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/app-context";
import { relativeTime, useClock, useSync } from "@/components/sync/sync-status";
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

function Panel({ title, description, children }: { title: string; description?: React.ReactNode; children: React.ReactNode }) {
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

export function AccountsForm({ leetcode, hackerrank }: { leetcode: string | null; hackerrank: string | null }) {
  const now = useClock();
  const router = useRouter();
  const { sync } = useApp();
  const [lc, setLc] = useState(leetcode ?? "");
  const [hr, setHr] = useState(hackerrank ?? "");
  const [pending, startTransition] = useTransition();
  const { busy, syncNow } = useSync();

  function save(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateAccounts({ leetcodeUsername: lc, hackerrankUsername: hr });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const r = res.data;
      if (!r) toast.success("Saved. Auto-tracking is off until you add a username.");
      else if (r.errors.length) toast.error(r.errors[0]);
      else toast.success(`Connected. ${r.added} recent ${r.added === 1 ? "solve" : "solves"} imported.`);
      router.refresh();
    });
  }

  return (
    <Panel
      title="Auto-tracking"
      description="Your public usernames. Every accepted problem is pulled in automatically, with its difficulty and topic. No passwords needed."
    >
      <form onSubmit={save} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="lc">LeetCode username</Label>
            <Input id="lc" value={lc} onChange={(e) => setLc(e.target.value)} placeholder="e.g. aaditya_codes" autoComplete="off" spellCheck={false} />
            <p className="text-xs text-muted-foreground">From leetcode.com/u/&lt;username&gt;</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="hr">HackerRank username</Label>
            <Input id="hr" value={hr} onChange={(e) => setHr(e.target.value)} placeholder="optional" autoComplete="off" spellCheck={false} />
            <p className="text-xs text-muted-foreground">From hackerrank.com/profile/&lt;username&gt;</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Connecting…" : "Save & sync"}
          </Button>
          {sync.connected && (
            <Button type="button" variant="secondary" onClick={() => !busy && syncNow()} disabled={busy}>
              <RefreshCwIcon className={cn(busy && "animate-spin")} /> Sync now
            </Button>
          )}
        </div>
        {sync.connected && (
          <div className={cn("rounded-lg border p-3 text-xs", sync.error ? "border-medium/40 bg-medium/5" : "border-border")}>
            <p>
              Last sync: <span className="num">{now ? relativeTime(sync.lastSyncedAt, now) : "…"}</span>. The app syncs whenever you open it (at most every
              10 minutes) and once a night.
            </p>
            {sync.error && (
              <p className="mt-1 flex items-start gap-1.5 text-medium">
                <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" /> {sync.error}
              </p>
            )}
            <p className="mt-1 text-muted-foreground">
              LeetCode only shares your last 20 accepted problems, so open the app at least once every ~20 solves to keep the topic split complete.
            </p>
          </div>
        )}
      </form>
    </Panel>
  );
}

export function DatesForm({ startDate, endDate, practiceEndDate }: { startDate: string; endDate: string; practiceEndDate: string }) {
  const router = useRouter();
  const [f, setF] = useState({ startDate, endDate, practiceEndDate });
  const [pending, startTransition] = useTransition();
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(f.startDate) && /^\d{4}-\d{2}-\d{2}$/.test(f.endDate);
  const days = valid ? diffDays(f.endDate, f.startDate) + 1 : 0;

  function save(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updatePlanDates(f);
      if (res.ok) {
        toast.success("Plan rebuilt for the new dates");
        router.refresh();
      } else toast.error(res.error);
    });
  }

  return (
    <Panel title="Plan dates" description="The day-by-day plan is rebuilt from these dates. Your solves are never touched.">
      <form onSubmit={save} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="start">Main plan starts</Label>
            <Input id="start" type="date" required value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} className="num" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="end">Main plan ends</Label>
            <Input id="end" type="date" required value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} className="num" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="practice">Practice phase ends</Label>
            <Input
              id="practice"
              type="date"
              required
              value={f.practiceEndDate}
              onChange={(e) => setF({ ...f, practiceEndDate: e.target.value })}
              className="num"
            />
          </div>
        </div>
        {valid && days > 0 && (
          <p className="text-xs text-muted-foreground">
            <span className="num">{days}</span> days: {formatDate(f.startDate, "EEE d MMM yyyy")} → {formatDate(f.endDate, "EEE d MMM yyyy")}
          </p>
        )}
        <Button type="submit" className="self-start" disabled={pending}>
          Save dates
        </Button>
      </form>
    </Panel>
  );
}

export function AccountActions() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();

  function reset() {
    startTransition(async () => {
      const res = await resetProgress({ confirm });
      if (res.ok) {
        toast.success("All tracked solves deleted");
        setOpen(false);
        setConfirm("");
        router.refresh();
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
            <DialogTitle>Delete all tracked solves?</DialogTitle>
            <DialogDescription>
              Clears every solve in this app. The next sync re-imports your last 20 LeetCode solves and your HackerRank history.
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
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
