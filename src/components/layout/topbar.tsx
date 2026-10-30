"use client";

import { usePathname } from "next/navigation";
import { KeyboardIcon } from "lucide-react";
import { formatDate } from "@/lib/dates";
import { TimerPill } from "@/components/timer/timer-controls";
import { useApp } from "@/components/app-context";
import { titleFor } from "./nav";

export function Topbar({ dayLabel }: { dayLabel: string }) {
  const pathname = usePathname();
  const { today } = useApp();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur md:px-6">
      <span className="truncate font-medium">{titleFor(pathname)}</span>
      <div className="ml-auto flex items-center gap-2">
        <TimerPill className="hidden sm:flex" />
        <span className="hidden text-sm text-muted-foreground sm:inline">{formatDate(today, "EEE, d MMM")}</span>
        <span className="num rounded-full border border-border bg-card px-2.5 py-0.5 text-xs">{dayLabel}</span>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("dsa:shortcuts"))}
          className="hidden size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-card-hover hover:text-foreground md:flex"
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts (?)"
        >
          <KeyboardIcon className="size-4" />
        </button>
      </div>
    </header>
  );
}
