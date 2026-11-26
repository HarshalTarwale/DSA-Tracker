"use client";

import { usePathname } from "next/navigation";
import { formatDate } from "@/lib/dates";
import { useApp } from "@/components/app-context";
import { SyncStatus } from "@/components/sync/sync-status";
import { titleFor } from "./nav";

export function Topbar({ dayLabel }: { dayLabel: string }) {
  const pathname = usePathname();
  const { today } = useApp();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur md:px-6">
      <span className="truncate font-medium">{titleFor(pathname)}</span>
      <div className="ml-auto flex items-center gap-2">
        <SyncStatus />
        <span className="hidden text-sm text-muted-foreground lg:inline">{formatDate(today, "EEE, d MMM")}</span>
        <span className="num hidden rounded-full border border-border bg-card px-2.5 py-0.5 text-xs sm:inline">{dayLabel}</span>
      </div>
    </header>
  );
}
