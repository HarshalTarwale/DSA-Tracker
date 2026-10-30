import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLinkIcon, InfoIcon } from "lucide-react";
import { companyFavorites, companyTiers, sources } from "@/lib/content";
import { cn } from "@/lib/utils";
import { getTopics } from "@/server/queries/topics";
import { PriorityBadge } from "@/components/shared/badges";
import { PageHeader, Section } from "@/components/shared/page";

export const metadata: Metadata = { title: "Companies" };
export const dynamic = "force-dynamic";

const HEAT = ["bg-card-hover text-muted-foreground", "bg-accent/20 text-foreground", "bg-accent/45 text-foreground", "bg-accent/80 text-white"];

export default async function CompaniesPage() {
  const topics = await getTopics();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Company needs" description="What each tier of company actually tests, and how this plan maps to it." />

      <div className="flex items-start gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        <InfoIcon className="mt-0.5 size-4 shrink-0" />
        Importance scores are a judgment-based synthesis, not official company data.
      </div>

      <Section title="Tiers">
        <div className="grid gap-3 lg:grid-cols-3">
          {companyTiers.map((t) => (
            <article key={t.tier} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold">{t.tier}</h3>
              <p className="text-sm text-muted-foreground">{t.examples}</p>
              <dl className="flex flex-col gap-2 text-sm">
                <Row label="Round" value={t.round} />
                <Row label="Topics" value={t.topics} />
                <Row label="Difficulty" value={t.difficulty} />
                <Row label="Volume" value={t.volume} />
              </dl>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Topic importance by tier (0–3)">
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="bg-surface text-xs text-muted-foreground">
              <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:font-medium">
                <th className="text-left">#</th>
                <th className="text-left">Topic</th>
                <th>Pri</th>
                <th className="w-16">Tier A</th>
                <th className="w-16">Tier B</th>
                <th className="w-16">Tier C</th>
                <th className="w-14">Sum</th>
                <th className="w-16">Days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {topics.map((t) => (
                <tr key={t.id} className="[&>td]:px-3 [&>td]:py-1.5">
                  <td className="num text-muted-foreground">{t.order}</td>
                  <td>
                    <Link href={`/topics/${t.id}`} className="hover:text-accent">
                      {t.name}
                    </Link>
                  </td>
                  <td className="text-center">
                    <PriorityBadge priority={t.priority} />
                  </td>
                  {[t.importanceA, t.importanceB, t.importanceC].map((v, i) => (
                    <td key={i} className="text-center">
                      <span className={cn("num inline-flex size-8 items-center justify-center rounded-md text-xs font-medium", HEAT[v] ?? HEAT[0])}>
                        {v}
                      </span>
                    </td>
                  ))}
                  <td className="num text-center font-medium">{t.importanceA + t.importanceB + t.importanceC}</td>
                  <td className="num text-center text-muted-foreground">{t.plannedDays}</td>
                </tr>
              ))}
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
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-start gap-1.5 text-sm text-accent hover:underline"
              >
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
