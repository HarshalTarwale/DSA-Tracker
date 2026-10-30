"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { updateProblem } from "@/server/actions/problems";
import { Button } from "@/components/ui/button";
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

const KEY = "dsa-timer:v1";

export interface TimerState {
  problemId: number;
  title: string;
  /** epoch ms when the current run started; null while paused */
  runningSince: number | null;
  /** ms accumulated before the current run */
  accumulatedMs: number;
}

/* ---------- localStorage-backed store (survives refresh, syncs across tabs) ---------- */

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedState: TimerState | null = null;

function read(): TimerState | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cachedRaw) return cachedState;
  cachedRaw = raw;
  try {
    cachedState = raw ? (JSON.parse(raw) as TimerState) : null;
  } catch {
    cachedState = null;
  }
  return cachedState;
}

function write(next: TimerState | null) {
  if (next) window.localStorage.setItem(KEY, JSON.stringify(next));
  else window.localStorage.removeItem(KEY);
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => e.key === KEY && cb();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function elapsedMs(t: TimerState, now = Date.now()): number {
  return t.accumulatedMs + (t.runningSince ? Math.max(0, now - t.runningSince) : 0);
}

export function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/* ---------------------------------- context ---------------------------------- */

interface TimerActions {
  start: (problemId: number, title: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  discard: () => void;
}

interface TimerApi extends TimerActions {
  timer: TimerState | null;
}

const TimerContext = createContext<TimerActions | null>(null);
const getNull = () => null;

export function TimerProvider({ children }: { children: React.ReactNode }) {
  // The provider never reads the timer itself: only leaf consumers subscribe, so the
  // localStorage value can't push a context update into not-yet-hydrated boundaries.
  const [stopped, setStopped] = useState<{ problemId: number; title: string; minutes: number } | null>(null);

  const start = useCallback((problemId: number, title: string) => {
    const cur = read();
    if (cur && cur.problemId !== problemId) {
      toast.error(`A timer is already running for “${cur.title}”. Stop it first.`);
      return;
    }
    if (cur && cur.problemId === problemId) {
      if (!cur.runningSince) write({ ...cur, runningSince: Date.now() });
      return;
    }
    write({ problemId, title, runningSince: Date.now(), accumulatedMs: 0 });
  }, []);

  const pause = useCallback(() => {
    const cur = read();
    if (cur?.runningSince) write({ ...cur, runningSince: null, accumulatedMs: elapsedMs(cur) });
  }, []);

  const resume = useCallback(() => {
    const cur = read();
    if (cur && !cur.runningSince) write({ ...cur, runningSince: Date.now() });
  }, []);

  const stop = useCallback(() => {
    const cur = read();
    if (!cur) return;
    const minutes = Math.max(1, Math.round(elapsedMs(cur) / 60_000));
    write(null);
    setStopped({ problemId: cur.problemId, title: cur.title, minutes });
  }, []);

  const discard = useCallback(() => write(null), []);

  const actions = useMemo(() => ({ start, pause, resume, stop, discard }), [start, pause, resume, stop, discard]);

  return (
    <TimerContext.Provider value={actions}>
      {children}
      <StopDialog stopped={stopped} onClose={() => setStopped(null)} />
    </TimerContext.Provider>
  );
}

export function useTimer(): TimerApi {
  const ctx = useContext(TimerContext);
  const timer = useSyncExternalStore(subscribe, read, getNull);
  if (!ctx) throw new Error("useTimer must be used inside <TimerProvider>");
  return { ...ctx, timer };
}

/** Re-renders every second while `active`; returns Date.now(). */
export function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

function StopDialog({
  stopped,
  onClose,
}: {
  stopped: { problemId: number; title: string; minutes: number } | null;
  onClose: () => void;
}) {
  const [minutes, setMinutes] = useState("");
  const [saving, setSaving] = useState(false);
  const value = minutes === "" ? String(stopped?.minutes ?? "") : minutes;

  async function add() {
    if (!stopped) return;
    const n = Math.round(Number(value));
    if (!Number.isFinite(n) || n < 1) {
      toast.error("Enter a whole number of minutes");
      return;
    }
    setSaving(true);
    const res = await updateProblem({ id: stopped.problemId, patch: { addMinutes: n } });
    setSaving(false);
    if (res.ok) {
      toast.success(`Added ${n} min to “${stopped.title}”`);
      setMinutes("");
      onClose();
    } else toast.error(res.error);
  }

  return (
    <Dialog
      open={!!stopped}
      onOpenChange={(o) => {
        if (!o) {
          setMinutes("");
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Timer stopped</DialogTitle>
          <DialogDescription>Add this time to “{stopped?.title}”?</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="timer-minutes">Minutes</Label>
          <Input
            id="timer-minutes"
            type="number"
            inputMode="numeric"
            min={1}
            className="num"
            value={value}
            onChange={(e) => setMinutes(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Discard
          </Button>
          <Button onClick={add} disabled={saving}>
            Add {value || 0} min to this problem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
