import type { Metadata } from "next";
import Link from "next/link";
import { CheckIcon, ExternalLinkIcon, InfoIcon } from "lucide-react";
import { companyFavorites, companyTiers, sources, topics } from "@/lib/content";
import { countSolves, tierReadiness } from "@/lib/progress";
import { TIERS } from "@/lib/targets";
import { cn } from "@/lib/utils";
import { getAppData } from "@/server/data";
import { PageHeader, Section } from "@/components/shared/page";
import { TierLadder } from "@/components/progress/progress-ui";

export const metadata: Metadata = { title: "Companies" };
export const dynamic = "force-dynamic";

const HEAT = ["bg-card-hover text-muted-foreground", "bg-accent/20 text-foreground", "bg-accent/45 text-foreground", "bg-accent/80 text-white"];

export default async function CompaniesPage() {
  const d = await getAppData();
  const tiers = TIERS.map((t) => tierReadiness(t, topics, d.progressById));
  const solved = countSolves(d.solves.filter((s) => s.topicId !== null)).total;
  const readyFor = [...tiers].reverse().find((t) => t.ready);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Companies & packages"
        description="Which topics each kind of company tests, and how close you are to each level."
      />

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm">
          {readyFor ? (
            <>
              Based on the topics you have mastered, you can target <b className="text-easy">Tier {readyFor.tier.key}</b> companies (
              {readyFor.tier.packageLpa}) now.
              {readyFor.tier.key !== "C" && <> Keep going for Tier C.</>}
            </>
          ) : (
            <>No tier unlocked yet. Each topic you master moves the bars below. Tier A unlocks first.</>
          )}
        </p>
        <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
          <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
          Package bands and topic importance are rough, judgment-based estimates for Indian fresher roles, not official data. Interviews also test
          communication, projects and CS basics.
        </p>
      </div>

      <Section title="Your package ladder">
        <TierLadder tiers={tiers} solvedTotal={solved} />
      </Section>

      <Section title="What each tier tests">
        <div className="grid gap-3 lg:grid-cols-3">
          {TIERS.map((t, i) => {
            const info = companyTiers[i];
            const r = tiers[i];
            return (
              <article key={t.key} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
                <div>
                  <h3 className="font-semibold">
                    Tier {t.key} · {t.name}
                  </h3>
                  <p className="num text-sm text-accent">{t.packageLpa}</p>
                </div>
                <p className="text-sm text-muted-foreground">{info?.examples ?? t.companies}</p>
                <dl className="flex flex-col gap-2 text-sm">
                  <Row label="Interview" value={t.interview} />
                  {info && <Row label="Difficulty" value={info.difficulty} />}
                  {info && <Row label="Volume" value={info.volume} />}
                </dl>
                <div>
                  <p className="mb-1.5 text-xs text-muted-foreground">
                    Must-know topics ({r.required.filter((x) => x.met).length}/{r.required.length} at the bar)
                  </p>
                  <ul className="flex flex-wrap gap-1.5">
                    {r.required.map((x) => (
                      <li key={x.topicId}>
                        <Link
                          href={`/topics/${x.topicId}`}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs",
                            x.met ? "border-easy/40 bg-easy/10 text-easy" : "border-border text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {x.met && <CheckIcon className="size-3" />}
                          {topics.find((tp) => tp.id === x.topicId)?.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
      </Section>

      <Section title="Topic importance by tier (0–3)">
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[30rem] text-sm">
            <thead className="bg-surface text-xs text-muted-foreground">
              <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:font-medium">
                <th className="text-left">Topic</th>
                <th className="w-16">A</th>
                <th className="w-16">B</th>
                <th className="w-16">C</th>
                <th className="w-24 text-right">You</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {topics.map((t) => {
                const p = d.progressById.get(t.id)!;
                return (
                  <tr key={t.id} className="[&>td]:px-3 [&>td]:py-1.5">
                    <td>
                      <Link href={`/topics/${t.id}`} className="hover:text-accent">
                        {t.name}
                      </Link>
                    </td>
                    {[t.importance.tierA, t.importance.tierB, t.importance.tierC].map((v, i) => (
                      <td key={i} className="text-center">
                        <span className={cn("num inline-flex size-7 items-center justify-center rounded-md text-xs font-medium", HEAT[v] ?? HEAT[0])}>{v}</span>
                      </td>
                    ))}
                    <td className="num text-right text-xs text-muted-foreground">{Math.round(p.score * 100)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Company favourites">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {companyFavorites.map((c) => (
            <article key={c.company} className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-4">
              <h3 className="font-medium">{c.company}</h3>
              <p className="text-sm">{c.topics}</p>
              <p className="text-xs text-muted-foreground">e.g. {c.examples}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Sources">
        <ul className="flex flex-col gap-2">
          {sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-start gap-1.5 text-sm text-accent hover:underline">
                <ExternalLinkIcon className="mt-0.5 size-3.5 shrink-0" />
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
