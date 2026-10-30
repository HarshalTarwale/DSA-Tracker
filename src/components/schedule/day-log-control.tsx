"use client";

import { useOptimistic, useState, useTransition } from "react";
import { CheckCircle2Icon } from "lucide-react";
import { toast } from "sonner";
import type { DayStatus } from "@/db/schema";
import { saveDayLog } from "@/server/actions/schedule";
import { DAY_STATUS_CLASS, DAY_STATUS_LABEL, DAY_STATUSES } from "@/lib/constants";
import type { DayLogDTO } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Patch = { status?: DayStatus | null; hoursSpent?: number | null; notes?: string | null };

function useDayLog(dayIndex: number, log: DayLogDTO | undefined) {
  const base: DayLogDTO = log ?? { dayIndex, status: null, hoursSpent: null, notes: null };
  const [state, apply] = useOptimistic(base, (s: DayLogDTO, patch: Patch) => ({ ...s, ...patch }));
  const [, startTransition] = useTransition();

  function save(patch: Patch, message: string) {
    startTransition(async () => {
      apply(patch);
      const res = await saveDayLog({ dayIndex, ...patch });
      if (res.ok) toast.success(message);
      else toast.error(res.error);
    });
  }
  return { state, save };
}

/** Compact yes / partial / skipped toggle (schedule cards). Click the active one to clear. */
export function DayStatusToggle({
  dayIndex,
  log,
  label,
  size = "sm",
}: {
  dayIndex: number;
  log: DayLogDTO | undefined;
  label: string;
  size?: "sm" | "md";
}) {
  const { state, save } = useDayLog(dayIndex, log);
  return (
    <div role="radiogroup" aria-label={`Day log for ${label}`} className="inline-flex gap-1">
      {DAY_STATUSES.map((s) => {
        const active = state.status === s;
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() =>
              save({ status: active ? null : s }, active ? `${label}: log cleared` : `${label}: ${DAY_STATUS_LABEL[s]}`)
            }
            className={cn(
              "rounded-md border px-2 font-medium transition-colors duration-150",
              size === "sm" ? "py-0.5 text-[11px]" : "py-1 text-xs",
              active ? DAY_STATUS_CLASS[s] : "border-border text-muted-foreground hover:bg-card-hover hover:text-foreground",
            )}
          >
            {DAY_STATUS_LABEL[s]}
          </button>
        );
      })}
    </div>
  );
}

/** Full day log (Today page): status, hours, notes + gentle "mark as done" prompt. */
export function DayLogCard({
  dayIndex,
  log,
  allProblemsDone,
  dailyHours,
}: {
  dayIndex: number;
  log: DayLogDTO | undefined;
  allProblemsDone: boolean;
  dailyHours: number;
}) {
  const { state, save } = useDayLog(dayIndex, log);
  const [hours, setHours] = useState(state.hoursSpent?.toString() ?? "");
  const [notes, setNotes] = useState(state.notes ?? "");
  const dirty = hours !== (state.hoursSpent?.toString() ?? "") || notes !== (state.notes ?? "");

  function saveDetails() {
    const h = hours.trim() === "" ? null : Number(hours);
    if (h !== null && (!Number.isFinite(h) || h < 0 || h > 24)) {
      toast.error("Hours must be between 0 and 24");
      return;
    }
    save({ hoursSpent: h, notes: notes.trim() || null }, "Day log saved");
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      {allProblemsDone && state.status !== "yes" && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-easy/30 bg-easy/10 px-3 py-2 text-sm">
          <CheckCircle2Icon className="size-4 text-easy" />
          <span className="flex-1">Every problem for today is done. Mark today as done?</span>
          <Button size="sm" variant="secondary" onClick={() => save({ status: "yes" }, "Today marked as done")}>
            Mark done
          </Button>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">How did today go?</span>
        <DayStatusToggleInner state={state.status} onPick={(s) => save({ status: s }, s ? `Day: ${DAY_STATUS_LABEL[s]}` : "Day log cleared")} />
      </div>
      <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
        <div className="flex flex-col gap-2">
          <Label htmlFor="hours">Hours spent</Label>
          <Input
            id="hours"
            type="number"
            inputMode="decimal"
            step="0.5"
            min={0}
            max={24}
            placeholder={`${dailyHours}`}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="num"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="day-notes">Notes</Label>
          <Textarea
            id="day-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What clicked, what didn’t…"
          />
        </div>
      </div>
      <Button size="sm" variant="secondary" className="self-end" disabled={!dirty} onClick={saveDetails}>
        Save log
      </Button>
    </div>
  );
}

function DayStatusToggleInner({ state, onPick }: { state: DayStatus | null; onPick: (s: DayStatus | null) => void }) {
  return (
    <div role="radiogroup" aria-label="Day status" className="grid grid-cols-3 gap-2 sm:inline-grid sm:w-auto">
      {DAY_STATUSES.map((s) => {
        const active = state === s;
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onPick(active ? null : s)}
            className={cn(
              "rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors duration-150",
              active ? DAY_STATUS_CLASS[s] : "border-border text-muted-foreground hover:bg-card-hover hover:text-foreground",
            )}
          >
            {DAY_STATUS_LABEL[s]}
          </button>
        );
      })}
    </div>
  );
}
