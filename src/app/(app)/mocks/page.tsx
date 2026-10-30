import type { Metadata } from "next";
import { Suspense } from "react";
import { dayIndexToDate, formatDate, relativeDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { getMocks } from "@/server/queries/journal";
import { getSchedule } from "@/server/queries/schedule";
import { getPlanClock } from "@/server/queries/settings";
import { PageHeader, Section } from "@/components/shared/page";
import { MocksBoard } from "@/components/mocks/mocks-board";

export const metadata: Metadata = { title: "Mocks" };
export const dynamic = "force-dynamic";

export default async function MocksPage() {
  const [clock, mocks, schedule] = await Promise.all([getPlanClock(), getMocks(), getSchedule()]);
  const mockDays = schedule
    .filter((d) => d.type === "mock")
    .map((d, i) => ({ ...d, n: i + 1, date: dayIndexToDate(clock.startDate, d.dayIndex) }));
  const next = mockDays.find((d) => d.date >= clock.today);
  const suggestedTitle = next && next.date === clock.today ? `Mock ${next.n}` : `Mock ${mocks.length + 1}`;

  return (
    <>
      <PageHeader title="Mock tests" description="Timed mocks are how you find out what you can do under pressure." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">
          <Suspense>
            <MocksBoard mocks={mocks} suggestedTitle={suggestedTitle} />
          </Suspense>
        </div>
        <Section title="Mock days in the plan">
          <ol className="flex flex-col gap-2">
            {mockDays.map((d) => {
              const past = d.date < clock.today;
              const isNext = d === next;
              return (
                <li
                  key={d.dayIndex}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border bg-card p-3",
                    isNext ? "border-accent/60" : "border-border",
                    past && "opacity-60",
                  )}
                >
                  <span className="num flex size-8 items-center justify-center rounded-full bg-hard/15 text-xs font-medium text-hard">
                    {d.n}
                  </span>
                  <div className="flex flex-col">
                    <span className="num text-sm">{formatDate(d.date, "EEE d MMM")}</span>
                    <span className="text-xs text-muted-foreground">
                      Day {d.dayIndex + 1} · {relativeDay(d.date, clock.today)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </Section>
      </div>
    </>
  );
}
