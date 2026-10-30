import type { Metadata } from "next";
import { ChevronDownIcon } from "lucide-react";
import { patternTriggers } from "@/lib/content";
import { getMistakes } from "@/server/queries/journal";
import { getProblems } from "@/server/queries/problems";
import { PageHeader } from "@/components/shared/page";
import { PatternTriggerList } from "@/components/shared/pattern-triggers";
import { MistakesBoard } from "@/components/mistakes/mistakes-board";

export const metadata: Metadata = { title: "Mistakes" };
export const dynamic = "force-dynamic";

export default async function MistakesPage() {
  const [mistakes, problems] = await Promise.all([getMistakes(), getProblems()]);
  const options = problems.map((p) => ({ id: p.id, lcNumber: p.lcNumber, title: p.title, topicId: p.topicId }));
  const resolved = mistakes.filter((m) => m.resolved).length;

  return (
    <>
      <PageHeader
        title="Mistake Log"
        description={
          mistakes.length
            ? `${mistakes.length} entries · ${resolved} re-solved. Your pattern notebook.`
            : "Your pattern notebook: one entry per miss."
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">
          <MistakesBoard mistakes={mistakes} problems={options} />
        </div>
        <aside className="order-first lg:order-none">
          {/* Mobile: collapsible */}
          <details className="group rounded-xl border border-border bg-card lg:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 p-4 [&::-webkit-details-marker]:hidden">
              <span className="section-title">Pattern triggers</span>
              <ChevronDownIcon className="ml-auto size-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-4 pb-4">
              <PatternTriggerList triggers={patternTriggers} />
            </div>
          </details>
          {/* Desktop: sticky side panel */}
          <div className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-xl border border-border bg-card p-4 lg:block">
            <h2 className="section-title mb-3">Pattern triggers</h2>
            <PatternTriggerList triggers={patternTriggers} />
          </div>
        </aside>
      </div>
    </>
  );
}
