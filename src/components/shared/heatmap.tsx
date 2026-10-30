"use client";

import { useState } from "react";
import { formatDate } from "@/lib/dates";
import { heatLevel, type HeatCell } from "@/lib/metrics";
import { cn } from "@/lib/utils";

const LEVEL = [
  "bg-card-hover",
  "bg-accent/25",
  "bg-accent/45",
  "bg-accent/70",
  "bg-accent",
];

const WEEKDAYS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];

/** GitHub-style grid: columns are weeks (Mon→Sun), intensity = counted events per IST date. */
export function Heatmap({
  cells,
  today,
  planStart,
  planEnd,
}: {
  cells: HeatCell[];
  today: string;
  planStart: string;
  planEnd: string;
}) {
  const [hover, setHover] = useState<HeatCell | null>(null);
  if (!cells.length) return null;

  const max = Math.max(1, ...cells.map((c) => c.count));
  // Monday = 0 … Sunday = 6 (computed from an anchor Monday: 2024-01-01)
  const dow = (d: string) => {
    const diff = Math.round((Date.parse(`${d}T00:00:00Z`) - Date.parse("2024-01-01T00:00:00Z")) / 86_400_000);
    return ((diff % 7) + 7) % 7;
  };
  const lead = dow(cells[0].date);
  const padded: (HeatCell | null)[] = [...Array<null>(lead).fill(null), ...cells];
  const weeks: (HeatCell | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

  const total = cells.reduce((s, c) => s + c.count, 0);
  const activeDays = cells.filter((c) => c.count > 0).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none" role="grid" aria-label="Activity heatmap">
        <div className="flex flex-col gap-1 pr-1 pt-4" aria-hidden>
          {WEEKDAYS.map((w, i) => (
            <span key={i} className="h-3 text-[9px] leading-3 text-muted-foreground">
              {w}
            </span>
          ))}
        </div>
        {weeks.map((week, wi) => {
          const first = week.find((c) => c)?.date;
          const showMonth = first && (wi === 0 || first.slice(8) <= "07");
          return (
            <div key={wi} className="flex flex-col gap-1" role="row">
              <span className="h-3 text-[9px] leading-3 whitespace-nowrap text-muted-foreground" aria-hidden>
                {showMonth ? formatDate(first, "MMM") : ""}
              </span>
              {Array.from({ length: 7 }, (_, di) => {
                const c = week[di];
                if (!c) return <span key={di} className="size-3" />;
                const inPlan = c.date >= planStart && c.date <= planEnd;
                return (
                  <span
                    key={di}
                    role="gridcell"
                    tabIndex={-1}
                    aria-label={`${formatDate(c.date, "EEE d MMM")}: ${c.count} ${c.count === 1 ? "event" : "events"}`}
                    title={`${formatDate(c.date, "EEE d MMM yyyy")} · ${c.count}`}
                    onMouseEnter={() => setHover(c)}
                    onMouseLeave={() => setHover(null)}
                    className={cn(
                      "size-3 rounded-[3px] transition-colors",
                      LEVEL[heatLevel(c.count, max)],
                      !inPlan && c.count === 0 && "opacity-40",
                      c.date === today && "ring-1 ring-foreground/70",
                      c.date > today && "opacity-30",
                    )}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="num" aria-live="polite">
          {hover
            ? `${formatDate(hover.date, "EEE d MMM")} · ${hover.count} ${hover.count === 1 ? "event" : "events"}`
            : `${total} events on ${activeDays} days`}
        </span>
        <span className="flex items-center gap-1">
          Less
          {LEVEL.map((l, i) => (
            <span key={i} className={cn("size-2.5 rounded-[2px]", l)} />
          ))}
          More
        </span>
      </div>
    </div>
  );
}
