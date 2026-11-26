import { cookies } from "next/headers";
import { topics } from "@/lib/content";
import { formatDate } from "@/lib/dates";
import { requirePageSession } from "@/server/auth";
import { getAppData } from "@/server/data";
import { isStale } from "@/server/sync";
import { AppProvider } from "@/components/app-context";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Sidebar, SIDEBAR_COOKIE } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { TooltipProvider } from "@/components/ui/tooltip";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requirePageSession();
  const [data, store] = await Promise.all([getAppData(), cookies()]);
  const { settings, phase, dayNumber, planDays, today } = data;

  const dayLabel =
    phase === "before"
      ? `Starts ${formatDate(settings.startDate, "d MMM")}`
      : phase === "plan"
        ? `Day ${dayNumber} / ${planDays}`
        : phase === "practice"
          ? "Practice phase"
          : "Plan complete";

  return (
    <AppProvider
      value={{
        today,
        topics: topics.map((t) => ({ id: t.id, name: t.name, order: t.order })),
        sync: {
          connected: !!(settings.leetcodeUsername || settings.hackerrankUsername),
          lastSyncedAt: settings.lastSyncedAt ? settings.lastSyncedAt.toISOString() : null,
          error: settings.lastSyncError,
          stale: isStale(settings.lastSyncedAt),
        },
      }}
    >
      <TooltipProvider>
        <div className="flex min-h-dvh">
          <Sidebar initialCollapsed={store.get(SIDEBAR_COOKIE)?.value === "1"} />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar dayLabel={dayLabel} />
            <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 md:px-6 md:pb-12">
              {children}
            </main>
          </div>
        </div>
        <BottomNav />
      </TooltipProvider>
    </AppProvider>
  );
}
