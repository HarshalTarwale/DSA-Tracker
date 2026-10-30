import type { Metadata } from "next";
import { CheckCircle2Icon } from "lucide-react";
import { computeRedoState } from "@/lib/metrics";
import { getProblems } from "@/server/queries/problems";
import { getPlanClock } from "@/server/queries/settings";
import { attemptedBacklog, redoView } from "@/server/views";
import { EmptyState, PageHeader, Section } from "@/components/shared/page";
import { ProblemList } from "@/components/problems/problem-list";
import { RedoList, type RedoItem } from "@/components/revision/redo-list";

export const metadata: Metadata = { title: "Revision" };
export const dynamic = "force-dynamic";

export default async function RevisionPage() {
  const [clock, problems] = await Promise.all([getPlanClock(), getProblems()]);
  const redo = redoView(problems, clock.today);
  const attempted = attemptedBacklog(problems);
  const inQueue = problems.filter((p) => computeRedoState(p, clock.today).inQueue).length;
  const mastered = problems.filter((p) => computeRedoState(p, clock.today).mastered).length;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Revision"
        description={
          <>
            Spaced repetition: starred problems come back at +1, +7 and +30 days after the date solved.{" "}
            <span className="num">{inQueue}</span> in the queue · <span className="num">{mastered}</span> mastered.
          </>
        }
      />

      <Bucket title="Overdue" items={redo.overdue} tone="text-hard" empty="Nothing overdue. Nice." />
      <Bucket title="Due today" items={redo.dueToday} tone="text-medium" empty="Nothing due today." />
      <Bucket title="Upcoming 7 days" items={redo.upcoming} empty="Nothing scheduled in the next week." showButton={false} />

      <Section
        title={
          <>
            Attempted backlog <span className="num ml-1 normal-case">{attempted.length}</span>
          </>
        }
      >
        {attempted.length ? (
          <ProblemList problems={attempted} options={{ statusVariant: "compact", showTopic: true, keyIdea: "reveal" }} />
        ) : (
          <EmptyState title="No attempted problems" description="Problems you tried but can’t code from memory yet show up here, oldest first." />
        )}
      </Section>
    </div>
  );
}

function Bucket({
  title,
  items,
  tone,
  empty,
  showButton = true,
}: {
  title: string;
  items: RedoItem[];
  tone?: string;
  empty: string;
  showButton?: boolean;
}) {
  return (
    <Section
      title={
        <>
          {title} <span className={`num ml-1 normal-case ${items.length ? (tone ?? "") : ""}`}>{items.length}</span>
        </>
      }
    >
      {items.length ? (
        <RedoList items={items} showButton={showButton} />
      ) : (
        <EmptyState icon={<CheckCircle2Icon />} title={empty} className="py-6" />
      )}
    </Section>
  );
}
