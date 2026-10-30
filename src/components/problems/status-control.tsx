"use client";

import { ChevronDownIcon } from "lucide-react";
import type { Status } from "@/db/schema";
import { STATUS_CLASS, STATUS_LABEL, STATUS_SHORT, STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/app-context";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function useStatusMeaning() {
  const { statusMeaning } = useApp();
  return (s: Status) => statusMeaning[STATUS_LABEL[s] as keyof typeof statusMeaning];
}

/** Four-way segmented control (Today / topic checklists). */
export function StatusSegmented({
  value,
  onChange,
  className,
  label,
}: {
  value: Status;
  onChange: (s: Status) => void;
  className?: string;
  label: string;
}) {
  const meaning = useStatusMeaning();
  return (
    <div
      role="radiogroup"
      aria-label={`Status for ${label}`}
      className={cn("inline-flex rounded-lg border border-border bg-background p-0.5", className)}
    >
      {STATUSES.map((s) => {
        const active = s === value;
        const c = STATUS_CLASS[s];
        return (
          <Tooltip key={s}>
            <TooltipTrigger asChild>
              <button
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => !active && onChange(s)}
                className={cn(
                  "flex-1 rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap transition-colors duration-150",
                  active ? cn(c.bg, c.text) : "text-muted-foreground hover:bg-card-hover hover:text-foreground",
                )}
              >
                {STATUS_SHORT[s]}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <span className="font-medium">{STATUS_LABEL[s]}:</span> {meaning(s)}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

/** Compact dropdown (dense tables). */
export function StatusSelect({
  value,
  onChange,
  className,
  label,
}: {
  value: Status;
  onChange: (s: Status) => void;
  className?: string;
  label: string;
}) {
  const meaning = useStatusMeaning();
  const c = STATUS_CLASS[value];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex h-7 w-[7.5rem] shrink-0 items-center gap-1.5 rounded-md border px-2 text-xs font-medium transition-colors duration-150 hover:brightness-125",
          c.bg,
          c.text,
          c.border,
          className,
        )}
        aria-label={`Status for ${label}: ${STATUS_LABEL[value]}`}
        title={meaning(value)}
      >
        <span className={cn("size-1.5 rounded-full", c.dot)} aria-hidden />
        <span className="flex-1 text-left">{STATUS_LABEL[value]}</span>
        <ChevronDownIcon className="size-3 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {STATUSES.map((s) => (
          <DropdownMenuItem key={s} onSelect={() => s !== value && onChange(s)} className="items-start">
            <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", STATUS_CLASS[s].dot)} aria-hidden />
            <span className="flex flex-col">
              <span className={cn("font-medium", s === value && STATUS_CLASS[s].text)}>{STATUS_LABEL[s]}</span>
              <span className="text-xs text-muted-foreground">{meaning(s)}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
