import type { Metadata } from "next";
import { Suspense } from "react";
import { getProblems } from "@/server/queries/problems";
import { PageHeader } from "@/components/shared/page";
import { AddProblemDialog } from "@/components/problems/add-dialog";
import { ProblemsExplorer } from "@/components/problems/problems-explorer";

export const metadata: Metadata = { title: "Problems" };
export const dynamic = "force-dynamic";

export default async function ProblemsPage() {
  const problems = await getProblems();
  const custom = problems.filter((p) => p.isCustom).length;
  return (
    <>
      <PageHeader
        title="Problems"
        description={`${problems.length - custom} planned${custom ? ` + ${custom} custom` : ""} · click a row to edit everything`}
        actions={<AddProblemDialog />}
      />
      <Suspense>
        <ProblemsExplorer problems={problems} />
      </Suspense>
    </>
  );
}
