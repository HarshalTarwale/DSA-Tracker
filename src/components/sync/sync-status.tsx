"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AlertTriangleIcon, Link2Icon, RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import { syncIfStale, syncNow } from "@/server/actions/sync";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/app-context";

/* A 30-second clock that renders nothing on the server (no hydration mismatch). */
function subscribeClock(cb: () => void) {
  const id = window.setInterval(cb, 30_000);
  return () => window.clearInterval(id);
}
const clockSnapshot = () => Math.floor(Date.now() / 30_000) * 30_000;
const serverClock = () => 0;

/** Current time rounded to 30s; 0 during server render (callers show a neutral label). */
export function useClock(): number {
  return useSyncExternalStore(subscribeClock, clockSnapshot, serverClock);
}

export function relativeTime(iso: string | null, now: number): string {
  if (!iso) return "never";
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

type Result = Awaited<ReturnType<typeof syncNow>>;

export function useSync() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handle(promise: Promise<Result | Awaited<ReturnType<typeof syncIfStale>>>, manual: boolean) {
    setBusy(true);
    try {
      const res = await promise;
      if (!res.ok) {
        if (manual) toast.error(res.error);
        return;
      }
      const r = res.data;
      if (!r) return;
      if (r.added > 0) {
        const names = r.addedTitles.slice(0, 3).join(", ");
        toast.success(`${r.added} new ${r.added === 1 ? "solve" : "solves"} tracked`, {
          description: names + (r.added > 3 ? "…" : ""),
        });
      } else if (manual && !r.errors.length) toast.success("Up to date, no new solves");
      if (r.errors.length && manual) toast.error(r.errors[0]);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return {
    busy,
    syncNow: () => handle(syncNow(), true),
    syncIfStale: () => handle(syncIfStale(), false),
  };
}

export function SyncStatus({ className }: { className?: string }) {
  const { sync } = useApp();
  const now = useClock();
  const { busy, syncNow, syncIfStale } = useSync();
  const started = useRef(false);

  // Automatic sync when the app opens (server skips it if the last one is recent).
  useEffect(() => {
    if (started.current || !sync.connected || !sync.stale) return;
    started.current = true;
    void syncIfStale();
  }, [sync.connected, sync.stale, syncIfStale]);

  if (!sync.connected) {
    return (
      <Link
        href="/settings"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-xs text-accent",
          className,
        )}
      >
        <Link2Icon className="size-3.5" /> Connect LeetCode
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => !busy && syncNow()}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs transition-colors hover:bg-card-hover",
        sync.error ? "border-medium/40 text-medium" : "border-border text-muted-foreground",
        className,
      )}
      title={sync.error ? `Last sync had a problem: ${sync.error}` : "Sync solves from LeetCode / HackerRank now"}
      aria-label="Sync solves now"
    >
      {sync.error && !busy ? (
        <AlertTriangleIcon className="size-3.5" />
      ) : (
        <RefreshCwIcon className={cn("size-3.5", busy && "animate-spin")} />
      )}
      <span className="num">{busy ? "Syncing…" : now ? `Synced ${relativeTime(sync.lastSyncedAt, now)}` : "Synced"}</span>
    </button>
  );
}
