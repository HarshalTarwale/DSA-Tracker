"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MenuIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TimerPill } from "@/components/timer/timer-controls";
import { isActive, MOBILE_TABS, NAV } from "./nav";

const SHORT: Record<string, string> = { "/": "Home" };

export function BottomNav({ revisionCount }: { revisionCount: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const tabs = NAV.filter((n) => MOBILE_TABS.includes(n.href));
  const rest = NAV.filter((n) => !MOBILE_TABS.includes(n.href));
  const moreActive = rest.some((n) => isActive(pathname, n.href));

  return (
    <>
      <div className="fixed inset-x-0 bottom-16 z-40 flex justify-center px-4 sm:hidden pb-safe">
        <TimerPill />
      </div>
      <nav
        aria-label="Main"
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur md:hidden"
      >
        <div className="grid h-16 grid-cols-5">
          {tabs.map((item) => {
            const active = isActive(pathname, item.href);
            const badge = item.href === "/revision" && revisionCount > 0 ? revisionCount : null;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 text-[11px] transition-colors",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <span className="relative">
                  <item.icon className={cn("size-5", active && "text-accent")} />
                  {badge !== null && (
                    <span className="num absolute -top-1.5 -right-3 rounded-full bg-medium px-1 text-[10px] leading-4 font-semibold text-black">
                      {badge}
                    </span>
                  )}
                </span>
                {SHORT[item.href] ?? item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-[11px]",
              moreActive ? "text-foreground" : "text-muted-foreground",
            )}
            aria-label="More pages"
          >
            <MenuIcon className={cn("size-5", moreActive && "text-accent")} />
            More
          </button>
        </div>
      </nav>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="pb-safe">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
            <SheetDescription className="sr-only">Other pages</SheetDescription>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-2 px-4 pb-6">
            {rest.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 text-xs transition-colors hover:bg-card-hover",
                  isActive(pathname, item.href) && "border-accent/50",
                )}
              >
                <item.icon className="size-5 text-muted-foreground" />
                {item.label}
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
