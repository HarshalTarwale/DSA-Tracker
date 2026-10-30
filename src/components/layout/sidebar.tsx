"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isActive, NAV } from "./nav";

export const SIDEBAR_COOKIE = "dsa_sidebar";

export function Sidebar({ initialCollapsed, revisionCount }: { initialCollapsed: boolean; revisionCount: number }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 md:flex",
        collapsed ? "w-16" : "w-56",
      )}
    >
      <div className={cn("flex h-14 items-center gap-2 px-4", collapsed && "justify-center px-0")}>
        <span className="num flex size-7 items-center justify-center rounded-lg border border-border bg-card text-xs font-semibold">
          {"{}"}
        </span>
        {!collapsed && <span className="font-semibold tracking-tight">DSA Tracker</span>}
      </div>
      <nav aria-label="Main" className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-2">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const badge = item.href === "/revision" && revisionCount > 0 ? revisionCount : null;
          const link = (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm transition-colors duration-150",
                active
                  ? "bg-accent/10 text-foreground"
                  : "text-muted-foreground hover:bg-card-hover hover:text-foreground",
                collapsed && "justify-center px-0",
              )}
            >
              <item.icon className={cn("size-4 shrink-0", active && "text-accent")} />
              {!collapsed && <span className="flex-1">{item.label}</span>}
              {badge !== null && (
                <span
                  className={cn(
                    "num rounded-full bg-medium/20 px-1.5 text-[11px] leading-5 font-medium text-medium",
                    collapsed && "absolute top-0.5 right-1 px-1 text-[10px] leading-4",
                  )}
                  aria-label={`${badge} redos due`}
                >
                  {badge}
                </span>
              )}
            </Link>
          );
          return collapsed ? (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ) : (
            link
          );
        })}
      </nav>
      <div className="border-t border-border p-2">
        <button
          type="button"
          onClick={toggle}
          className={cn(
            "flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-sm text-muted-foreground transition-colors hover:bg-card-hover hover:text-foreground",
            collapsed && "justify-center px-0",
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpenIcon className="size-4" /> : <PanelLeftCloseIcon className="size-4" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
