import Link from "next/link";
import { CheckCircle2Icon, LockIcon } from "lucide-react";
import { topicById } from "@/lib/content";
import { TOPIC_STATUS_CLASS } from "@/lib/constants";
import type { TierReadiness, TopicProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";
import { TopicStatusBadge } from "@/components/shared/badges";
import { Bar } from "@/components/shared/progress";

/** "3/8" with the solved part coloured by difficulty. */
export function Frac({ solved, target, cls }: { solved: number; target: number; cls: string }) {
  const done = target > 0 && solved >= target;
  return (
    <span className="num text-xs whitespace-nowrap">
      <span className={cn(solved > 0 ? cls : "text-muted-foreground", done && "font-semibold")}>{solved}</span>
      <span className="text-muted-foreground">/{target}</span>
    </span>
  );
}

export function EmhCompact({ p }: { p: TopicProgress }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span title="Easy solved / target">
        <span className="mr-1 text-[10px] text-easy">E</span>
        <Frac solved={p.solved.easy} target={p.target.easy} cls="text-easy" />
      </span>
      <span title="Medium solved / target">
        <span className="mr-1 text-[10px] text-medium">M</span>
        <Frac solved={p.solved.medium} target={p.target.medium} cls="text-medium" />
      </span>
      <span title="Hard solved / target">
        <span className="mr-1 text-[10px] text-hard">H</span>
        <Frac solved={p.solved.hard} target={p.target.hard} cls="text-hard" />
      </span>
    </span>
  );
}

/** One topic: name, E/M/H solved vs target, mastery bar and status. */
export function TopicRow({ p, current, href = true }: { p: TopicProgress; current?: boolean; href?: boolean }) {
  const t = topicById.get(p.topicId)!;
  const body = (
    <div
      className={cn(
        "grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-lg px-3 py-2.5 transition-colors sm:grid-cols-[1.5rem_minmax(0,1fr)_auto_7rem_6.5rem]",
        href && "hover:bg-card-hover",
        current && "bg-accent/5 ring-1 ring-accent/40",
      )}
    >
      <span className="num text-xs text-muted-foreground">{t.order}</span>
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm">{t.name}</span>
        {current && <span className="shrink-0 text-[10px] font-semibold tracking-wide text-accent uppercase">Now</span>}
      </span>
      <EmhCompact p={p} />
      <span className="col-span-2 flex items-center gap-2 sm:col-span-1 sm:col-start-4">
        <Bar value={p.score} fillClass={TOPIC_STATUS_CLASS[p.status].bar} className="flex-1" label={`${t.name} mastery`} />
        <span className="num w-8 text-right text-[11px] text-muted-foreground">{Math.round(p.score * 100)}%</span>
      </span>
      <TopicStatusBadge status={p.status} className="col-start-3 row-start-2 justify-self-end sm:col-start-5 sm:row-start-1" />
    </div>
  );
  return href ? (
    <Link href={`/topics/${p.topicId}`} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

/** Tier A → B → C with readiness bars. */
export function TierLadder({ tiers, solvedTotal, compact = false }: { tiers: TierReadiness[]; solvedTotal: number; compact?: boolean }) {
  return (
    <ol className="flex flex-col gap-3">
      {tiers.map(({ tier, readiness, ready, required }) => {
        const missing = required.filter((r) => !r.met).sort((a, b) => b.importance - a.importance || a.score - b.score);
        return (
          <li key={tier.key} className={cn("flex flex-col gap-2 rounded-xl border p-3", ready ? "border-easy/40 bg-easy/5" : "border-border")}>
            <div className="flex items-center gap-2">
              {ready ? <CheckCircle2Icon className="size-4 text-easy" /> : <LockIcon className="size-4 text-muted-foreground" />}
              <span className="text-sm font-medium">
                Tier {tier.key} · {tier.name}
              </span>
              <span className="num ml-auto text-sm font-semibold">{tier.packageLpa}</span>
            </div>
            <div className="flex items-center gap-2">
              <Bar value={readiness} fillClass={ready ? "bg-easy" : "bg-accent"} className="flex-1" label={`Tier ${tier.key} readiness`} />
              <span className="num w-10 text-right text-xs">{Math.round(readiness * 100)}%</span>
            </div>
            {!compact && (
              <p className="text-xs text-muted-foreground">
                {tier.companies}. Usually ~<span className="num">{tier.benchmarkSolved}</span> problems solved (you:{" "}
                <span className="num text-foreground">{solvedTotal}</span>).
              </p>
            )}
            {!ready && missing.length > 0 && (
              <p className="text-xs text-muted-foreground">
                To unlock: {missing.slice(0, compact ? 3 : 6).map((m) => topicById.get(m.topicId)?.name).join(", ")}
                {missing.length > (compact ? 3 : 6) ? ` +${missing.length - (compact ? 3 : 6)} more` : ""}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
