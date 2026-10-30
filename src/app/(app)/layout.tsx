import { cookies } from "next/headers";
import { statusMeaning } from "@/lib/content";
import { bucketRedo } from "@/lib/metrics";
import { requirePageSession } from "@/server/auth";
import { getProblems } from "@/server/queries/problems";
import { getPlanClock } from "@/server/queries/settings";
import { getTopics, toTopicOptions } from "@/server/queries/topics";
import { AppProvider } from "@/components/app-context";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Shortcuts } from "@/components/layout/shortcuts";
import { Sidebar, SIDEBAR_COOKIE } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { TimerProvider } from "@/components/timer/timer-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requirePageSession();
  const [clock, problems, topics, store] = await Promise.all([
    getPlanClock(),
    getProblems(),
    getTopics(),
    cookies(),
  ]);

  const redo = bucketRedo(problems, clock.today);
  const revisionCount = redo.overdue.length + redo.dueToday.length;
  const dayLabel =
    clock.phase === "before"
      ? `Starts in ${-clock.todayIndex}d`
      : clock.phase === "after"
        ? "Plan complete"
        : `Day ${clock.dayNumber} / 112`;

  return (
    <AppProvider
      value={{
        today: clock.today,
        startDate: clock.startDate,
        todayIndex: clock.todayIndex,
        statusMeaning,
        topics: toTopicOptions(topics),
      }}
    >
      <TooltipProvider>
        <TimerProvider>
          <div className="flex min-h-dvh">
            <Sidebar
              initialCollapsed={store.get(SIDEBAR_COOKIE)?.value === "1"}
              revisionCount={revisionCount}
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <Topbar dayLabel={dayLabel} />
              <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 md:px-6 md:pb-12">
                {children}
              </main>
            </div>
          </div>
          <BottomNav revisionCount={revisionCount} />
          <Shortcuts />
        </TimerProvider>
      </TooltipProvider>
    </AppProvider>
  );
}
