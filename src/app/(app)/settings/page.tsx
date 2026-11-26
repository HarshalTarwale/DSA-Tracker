import type { Metadata } from "next";
import { getSettings } from "@/server/data";
import { PageHeader } from "@/components/shared/page";
import { AccountActions, AccountsForm, DatesForm } from "@/components/settings/settings-forms";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const s = await getSettings();
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title="Settings" />
      <AccountsForm
        key={`${s.leetcodeUsername}:${s.hackerrankUsername}`}
        leetcode={s.leetcodeUsername}
        hackerrank={s.hackerrankUsername}
      />
      <DatesForm key={`${s.startDate}:${s.endDate}:${s.practiceEndDate}`} startDate={s.startDate} endDate={s.endDate} practiceEndDate={s.practiceEndDate} />
      <AccountActions />
    </div>
  );
}
