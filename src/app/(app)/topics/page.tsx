import type { Metadata } from "next";
import Link from "next/link";
import { topics } from "@/lib/content";
import { TOPIC_STATUS_CLASS } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { topicBlocks } from "@/lib/plan";
import { cn } from "@/lib/utils";
import { getAppData } from "@/server/data";
import { ImportanceDots, PriorityBadge, TopicStatusBadge } from "@/components/shared/badges";
import { PageHeader } from "@/components/shared/page";
import { DiffBar, ProgressRing } from "@/components/shared/progress";

export const metadata: Metadata = { title: "Topics" };
export const dynamic = "force-dynamic";

export default async function TopicsPage() {
  const d = await getAppData();
  const blocks = new Map(topicBlocks(d.plan).map((b) => [b.topicId, b]));
  const mastered = d.progress.filter((p) => p.status === "mastered").length;

  return (
    <>
      <PageHeader
        title="Topics"
        description={`25 topics in study order, from what every company tests to what top companies add. ${mastered}/25 mastered. Counts fill in automatically from your solves.`}
      />
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {topics.map((t) => {
          const p = d.progressById.get(t.id)!;
          const b = blocks.get(t.id);
          const now = !!b && b.start <= d.today && b.end >= d.today;
          return (
            <li key={t.id}>
              <Link
                href={`/topics/${t.id}`}
                className={cn(
                  "flex h-full flex-col gap-3 rounded-xl border bg-card p-4 transition-colors duration-150 hover:bg-card-hover",
                  now ? "border-accent/50" : "border-border",
                )}
              >
                <div className="flex items-start gap-3">
                  <ProgressRing value={p.score} size={52} stroke={5} colorClass={TOPIC_STATUS_CLASS[p.status].text === "text-muted-foreground" ? "text-accent" : TOPIC_STATUS_CLASS[p.status].text} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="num text-xs text-muted-foreground">{t.order}</span>
                      <PriorityBadge priority={t.priority} />
                      {now && <span className="text-[11px] font-semibold text-accent uppercase">Now</span>}
                    </div>
                    <h2 className="leading-snug font-medium">{t.name}</h2>
                    <p className="num text-xs text-muted-foreground">
                      {b ? `${formatDate(b.start, "d MMM")} – ${formatDate(b.end, "d MMM")} · ${b.days} days` : "Not scheduled"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <DiffBar label="Easy" solved={p.solved.easy} target={p.target.easy} fillClass="bg-easy" />
                  <DiffBar label="Medium" solved={p.solved.medium} target={p.target.medium} fillClass="bg-medium" />
                  <DiffBar label="Hard" solved={p.solved.hard} target={p.target.hard} fillClass="bg-hard" />
                </div>
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
                  <TopicStatusBadge status={p.status} />
                  <span className="flex gap-3" title="How much each company tier asks this topic (0–3)">
                    <ImportanceDots value={t.importance.tierA} label="A" />
                    <ImportanceDots value={t.importance.tierB} label="B" />
                    <ImportanceDots value={t.importance.tierC} label="C" />
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
