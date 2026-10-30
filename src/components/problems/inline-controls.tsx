"use client";

import { StarIcon } from "lucide-react";
import type { How } from "@/db/schema";
import { HOW_LABEL, HOWS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const field =
  "h-7 rounded-md border border-border bg-background px-1.5 text-xs outline-none transition-colors duration-150 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

export function HowSelect({
  value,
  onChange,
  label,
  className,
}: {
  value: How | null;
  onChange: (v: How | null) => void;
  label: string;
  className?: string;
}) {
  return (
    <select
      aria-label={`How you solved ${label}`}
      value={value ?? ""}
      onChange={(e) => onChange((e.target.value || null) as How | null)}
      className={cn(field, "w-[5.5rem] pr-1", !value && "text-muted-foreground", className)}
    >
      <option value="">How…</option>
      {HOWS.map((h) => (
        <option key={h} value={h}>
          {HOW_LABEL[h]}
        </option>
      ))}
    </select>
  );
}

export function TimeInput({
  value,
  onChange,
  label,
  className,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  label: string;
  className?: string;
}) {
  function commit(raw: string) {
    const trimmed = raw.trim();
    const n = trimmed === "" ? null : Math.round(Number(trimmed));
    if (n !== null && (!Number.isFinite(n) || n < 0)) return;
    if (n !== value) onChange(n);
  }
  return (
    <label className={cn("relative inline-flex items-center", className)}>
      <span className="sr-only">Minutes spent on {label}</span>
      <input
        key={value ?? "empty"}
        type="number"
        inputMode="numeric"
        min={0}
        defaultValue={value ?? ""}
        placeholder="min"
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className={cn(field, "num w-16 pr-6 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none")}
      />
      {value !== null && (
        <span className="pointer-events-none absolute right-1.5 text-[10px] text-muted-foreground">m</span>
      )}
    </label>
  );
}

export function RedoStar({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={value}
      aria-label={value ? `Unstar ${label} for redo` : `Star ${label} for redo`}
      title={value ? "Starred for redo (+1 / +7 / +30)" : "Star for redo"}
      onClick={() => onChange(!value)}
      className="flex size-7 items-center justify-center rounded-md transition-colors hover:bg-card-hover"
    >
      <StarIcon className={cn("size-4", value ? "fill-medium text-medium" : "text-muted-foreground")} />
    </button>
  );
}
