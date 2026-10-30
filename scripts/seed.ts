/**
 * Idempotent seed: safe to re-run at any time, never destroys progress.
 *  - upserts topics by id
 *  - upserts planned problems by lcNumber, updating plan fields only (never user fields)
 *  - rebuilds schedule_days + schedule_day_problems (day_logs are keyed by dayIndex and kept)
 *  - inserts the settings singleton only if missing
 *
 * Usage: npm run db:seed   (reads DATABASE_URL from .env.local or .env)
 */
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { count, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/db/schema";
import { seed } from "../src/lib/content";

config({ path: ".env.local" });
config();

const { topics, problems, scheduleDays, scheduleDayProblems, settings } = schema;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (put it in .env.local)");
  const db = drizzle({ client: neon(url), schema });

  // 1. Topics
  await db
    .insert(topics)
    .values(
      seed.topics.map((t) => ({
        id: t.id,
        order: t.order,
        name: t.name,
        priority: t.priority,
        phase: t.phase,
        plannedDays: t.plannedDays,
        importanceA: t.importance.tierA,
        importanceB: t.importance.tierB,
        importanceC: t.importance.tierC,
        dailyFocus: t.dailyFocus,
      })),
    )
    .onConflictDoUpdate({
      target: topics.id,
      set: {
        order: sql`excluded."order"`,
        name: sql`excluded.name`,
        priority: sql`excluded.priority`,
        phase: sql`excluded.phase`,
        plannedDays: sql`excluded.planned_days`,
        importanceA: sql`excluded.importance_a`,
        importanceB: sql`excluded.importance_b`,
        importanceC: sql`excluded.importance_c`,
        dailyFocus: sql`excluded.daily_focus`,
      },
    });

  // 2. Planned problems — plan fields only; status/solvedAt/how/... are never touched.
  await db
    .insert(problems)
    .values(
      seed.problems.map((p) => ({
        lcNumber: p.lcNumber,
        order: p.order,
        title: p.title,
        url: p.url,
        difficulty: p.difficulty.toLowerCase() as "easy" | "medium" | "hard",
        topicId: p.topicId,
        keyIdea: p.keyIdea,
        isCustom: false,
      })),
    )
    .onConflictDoUpdate({
      target: problems.lcNumber,
      set: {
        order: sql`excluded."order"`,
        title: sql`excluded.title`,
        url: sql`excluded.url`,
        difficulty: sql`excluded.difficulty`,
        topicId: sql`excluded.topic_id`,
        keyIdea: sql`excluded.key_idea`,
      },
    });

  // 3. Schedule (rebuilt atomically; day_logs untouched)
  const lcNumbers = seed.problems.map((p) => p.lcNumber);
  const rows = await db
    .select({ id: problems.id, lcNumber: problems.lcNumber })
    .from(problems)
    .where(inArray(problems.lcNumber, lcNumbers));
  const idByLc = new Map(rows.map((r) => [r.lcNumber as number, r.id]));

  const links = seed.schedule.flatMap((d) =>
    d.problemIds.map((lc, position) => {
      const problemId = idByLc.get(lc);
      if (!problemId) throw new Error(`Schedule day ${d.dayIndex} references unknown LC ${lc}`);
      return { dayIndex: d.dayIndex, problemId, position };
    }),
  );

  await db.batch([
    db.delete(scheduleDayProblems),
    db.delete(scheduleDays),
    db.insert(scheduleDays).values(
      seed.schedule.map((d) => ({
        dayIndex: d.dayIndex,
        type: d.type,
        phase: d.phase,
        topicId: d.topicId,
        title: d.title,
        focus: d.focus,
      })),
    ),
    db.insert(scheduleDayProblems).values(links),
  ]);

  // 4. Settings singleton (only if missing)
  await db
    .insert(settings)
    .values({ id: 1, startDate: seed.meta.defaultStartDate, dailyHours: seed.meta.defaultDailyHours })
    .onConflictDoNothing({ target: settings.id });

  // 5. Report + assert
  const [[t], [p], [d], [e], [m], [h], [c]] = await Promise.all([
    db.select({ n: count() }).from(topics),
    db.select({ n: count() }).from(problems).where(eq(problems.isCustom, false)),
    db.select({ n: count() }).from(scheduleDays),
    db.select({ n: count() }).from(problems).where(sql`${problems.isCustom} = false and ${problems.difficulty} = 'easy'`),
    db.select({ n: count() }).from(problems).where(sql`${problems.isCustom} = false and ${problems.difficulty} = 'medium'`),
    db.select({ n: count() }).from(problems).where(sql`${problems.isCustom} = false and ${problems.difficulty} = 'hard'`),
    db.select({ n: count() }).from(problems).where(eq(problems.isCustom, true)),
  ]);

  console.log(`Topics:         ${t.n}`);
  console.log(`Problems:       ${p.n}  (E ${e.n} / M ${m.n} / H ${h.n})  + ${c.n} custom`);
  console.log(`Schedule days:  ${d.n}`);
  console.log(`Schedule links: ${links.length}`);

  const expected = seed.meta.counts;
  const ok =
    t.n === expected.topics &&
    p.n === expected.problems &&
    d.n === seed.meta.planDays &&
    e.n === expected.easy &&
    m.n === expected.medium &&
    h.n === expected.hard;
  if (!ok) {
    throw new Error(
      `Seed count mismatch: expected ${expected.topics}/${expected.problems}/${seed.meta.planDays} ` +
        `(E${expected.easy}/M${expected.medium}/H${expected.hard})`,
    );
  }
  console.log("✓ Seed OK (25 topics / 252 problems / 112 days)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
