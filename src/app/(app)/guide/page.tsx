import type { Metadata } from "next";
import { patternTriggers, rules, statusMeaning } from "@/lib/content";
import type { Status } from "@/db/schema";
import { STATUS_CLASS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { PageHeader, Section } from "@/components/shared/page";
import { PatternTriggerList } from "@/components/shared/pattern-triggers";

export const metadata: Metadata = { title: "Guide" };

const FLOW = [
  ["Open Today", "See the focus concept, today’s problems and any carry-over. Learn the concept first."],
  ["Think, then solve", "Keep the key idea hidden. 25–30 minutes alone, then one hint, then the solution."],
  ["Log it in one click", "Set the status. If you used a hint or the solution, set How and it’s starred for redo automatically."],
  ["Clear redos", "Starred problems come back at +1, +7 and +30 days. Hit “Redo done” after redoing from scratch."],
  ["Write the miss down", "Add a Mistake Log entry with the trigger words and the correct idea in one line."],
  ["Close the day", "Log the day as Done / Partial / Skipped with hours. The Dashboard tells you if you’re on track."],
];

const STATUS_KEYS: Record<keyof typeof statusMeaning, Status> = {
  "Not started": "not_started",
  Attempted: "attempted",
  Solved: "solved",
  Revised: "revised",
};

export default function GuidePage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Guide" description="How to use the tracker, and the rules that make the plan work." />

      <Section title="Daily flow">
        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {FLOW.map(([title, text], i) => (
            <li key={title} className="flex gap-3 rounded-xl border border-border bg-card p-4">
              <span className="num flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-medium text-accent">
                {i + 1}
              </span>
              <div>
                <h3 className="text-sm font-medium">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Status meanings">
        <dl className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(statusMeaning) as (keyof typeof statusMeaning)[]).map((k) => {
            const c = STATUS_CLASS[STATUS_KEYS[k]];
            return (
              <div key={k} className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4">
                <dt className={cn("flex items-center gap-2 text-sm font-medium", c.text)}>
                  <span className={cn("size-2 rounded-full", c.dot)} />
                  {k}
                </dt>
                <dd className="text-sm text-muted-foreground">{statusMeaning[k]}</dd>
              </div>
            );
          })}
        </dl>
        <p className="text-xs text-muted-foreground">Only Solved and Revised count toward your totals.</p>
      </Section>

      <Section title="Weekly rhythm">
        <div className="grid gap-2 sm:grid-cols-3">
          <Rhythm title="Study days" tone="text-foreground">
            Six days a week: learn the day’s focus concept, then solve the scheduled problems (about 3 hours).
          </Rhythm>
          <Rhythm title="Review day" tone="text-p3">
            Every 7th day: LeetCode weekly contest, redo every starred or Attempted problem from the week, update the
            Mistake Log.
          </Rhythm>
          <Rhythm title="Mock days" tone="text-hard">
            Six of the review slots are timed mocks: 3 unseen problems in 90 minutes, no hints, then 90 minutes reviewing
            every miss. The last 8 days are revision and mocks.
          </Rhythm>
        </div>
      </Section>

      <Section title="Rules for building logic">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {rules.map((r) => (
            <article key={r.title} className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-medium">{r.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{r.text}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Pattern triggers">
        <div className="rounded-xl border border-border bg-card p-4">
          <PatternTriggerList triggers={patternTriggers} className="sm:grid sm:grid-cols-2 sm:gap-x-8 sm:divide-y-0" />
        </div>
      </Section>

      <Section title="Keyboard shortcuts">
        <p className="text-sm text-muted-foreground">
          Press <kbd className="num rounded border border-border px-1">?</kbd> anywhere to see them.{" "}
          <kbd className="num rounded border border-border px-1">g</kbd> then{" "}
          <kbd className="num rounded border border-border px-1">t</kbd> jumps to Today.
        </p>
      </Section>
    </div>
  );
}

function Rhythm({ title, tone, children }: { title: string; tone: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className={cn("text-sm font-medium", tone)}>{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
