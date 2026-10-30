"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useShortcuts } from "@/hooks/use-shortcuts";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NAV } from "./nav";

export const SEARCH_INPUT_ID = "problem-search";

const ROWS: [string[], string][] = [
  ...NAV.filter((n) => n.key).map((n) => [["g", n.key!], `Go to ${n.label}`] as [string[], string]),
  [["/"], "Focus search (Problems)"],
  [["?"], "Show this help"],
];

export function Shortcuts() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const goto = Object.fromEntries(
    NAV.filter((n) => n.key).map((n) => [n.key!, () => router.push(n.href)]),
  );

  useShortcuts({
    goto,
    onSlash: () => {
      const el = document.getElementById(SEARCH_INPUT_ID);
      if (el instanceof HTMLInputElement) el.focus();
      else router.push("/problems?focus=1");
    },
    onHelp: () => setOpen(true),
  });

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("dsa:shortcuts", show);
    return () => window.removeEventListener("dsa:shortcuts", show);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Shortcuts are ignored while typing.</DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col divide-y divide-border">
          {ROWS.map(([keys, label]) => (
            <li key={label} className="flex items-center justify-between py-2 text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="flex items-center gap-1">
                {keys.map((k, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <span className="text-xs text-muted-foreground">then</span>}
                    <kbd className="num rounded-md border border-border bg-background px-1.5 py-0.5 text-xs">{k}</kbd>
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
