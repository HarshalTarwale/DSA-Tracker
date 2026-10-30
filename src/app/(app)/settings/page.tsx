import type { Metadata } from "next";
import { PLAN_DAYS } from "@/lib/content";
import { getSettings } from "@/server/queries/settings";
import { PageHeader } from "@/components/shared/page";
import { DangerPanel, ExportPanel, ImportPanel, PlanSettings } from "@/components/settings/settings-panels";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title="Settings" />
      <PlanSettings
        key={`${settings.startDate}:${settings.dailyHours}`}
        startDate={settings.startDate}
        dailyHours={settings.dailyHours}
        planDays={PLAN_DAYS}
      />
      <ExportPanel />
      <ImportPanel />
      <DangerPanel />
    </div>
  );
}
