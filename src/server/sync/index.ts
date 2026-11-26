import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { PlatformTotals } from "@/db/schema";
import { curatedBySlug } from "@/lib/content";
import { todayIST } from "@/lib/dates";
import { normalizeDifficulty, topicFromHackerRank, topicFromLeetCodeTags } from "@/lib/topic-map";
import { loadSettings } from "@/server/data";
import { fetchHackerRankChallenge, fetchHackerRankRecent } from "./hackerrank";
import { fetchLeetCodeProfile, fetchLeetCodeQuestion, SyncError } from "./leetcode";

/** How old the last sync may be before a page visit triggers a new one. */
export const STALE_MS = 10 * 60 * 1000;

export interface SyncResult {
  added: number;
  addedTitles: string[];
  errors: string[];
  ranAt: string;
}

type NewSolve = typeof schema.solves.$inferInsert;

/** Run `fn` over items with limited concurrency. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k]);
      }
    }),
  );
  return out;
}

const istDate = (d: Date) => todayIST(d);

function message(err: unknown): string {
  if (err instanceof SyncError) return err.message;
  if (err instanceof Error && err.name === "TimeoutError") return "request timed out";
  return err instanceof Error ? err.message : String(err);
}

async function knownSlugs(source: "leetcode" | "hackerrank"): Promise<Set<string>> {
  const rows = await getDb()
    .select({ slug: schema.solves.slug })
    .from(schema.solves)
    .where(eq(schema.solves.source, source));
  return new Set(rows.map((r) => r.slug));
}

async function syncLeetCode(username: string, warn: (m: string) => void): Promise<{ rows: NewSolve[]; totals: PlatformTotals }> {
  const { recent, totals } = await fetchLeetCodeProfile(username);
  const known = await knownSlugs("leetcode");

  // Oldest first so the earliest accepted time wins for repeated solves.
  const fresh = new Map<string, (typeof recent)[number]>();
  for (const r of [...recent].sort((a, b) => a.solvedAt.getTime() - b.solvedAt.getTime())) {
    if (!known.has(r.slug) && !fresh.has(r.slug)) fresh.set(r.slug, r);
  }

  const rows = await mapLimit([...fresh.values()], 4, async (r): Promise<NewSolve | null> => {
    const curated = curatedBySlug.get(r.slug);
    const base = {
      source: "leetcode" as const,
      slug: r.slug,
      url: `https://leetcode.com/problems/${r.slug}/`,
      solvedAt: r.solvedAt,
      solvedDate: istDate(r.solvedAt),
    };
    if (curated) {
      return { ...base, title: curated.title, lcNumber: curated.lcNumber, difficulty: curated.difficulty, topicId: curated.topicId, tags: [] };
    }
    const q = await fetchLeetCodeQuestion(r.slug).catch((e) => {
      warn(`LeetCode: skipped "${r.title}" (${message(e)}), will retry next sync`);
      return null;
    });
    if (!q) return null;
    return {
      ...base,
      title: q.title,
      lcNumber: q.lcNumber,
      difficulty: normalizeDifficulty(q.difficulty),
      topicId: topicFromLeetCodeTags(q.tags),
      tags: q.tags,
    };
  });
  return { rows: rows.filter((x): x is NewSolve => x !== null), totals };
}

async function syncHackerRank(username: string, warn: (m: string) => void): Promise<NewSolve[]> {
  const known = await knownSlugs("hackerrank");
  const recent = await fetchHackerRankRecent(username, known);
  const fresh = new Map<string, (typeof recent)[number]>();
  for (const r of [...recent].sort((a, b) => a.solvedAt.getTime() - b.solvedAt.getTime())) {
    if (!known.has(r.slug) && !fresh.has(r.slug)) fresh.set(r.slug, r);
  }
  const rows = await mapLimit([...fresh.values()], 4, async (r): Promise<NewSolve | null> => {
    const c = await fetchHackerRankChallenge(r.contest, r.slug).catch((e) => {
      warn(`HackerRank: skipped "${r.title}" (${message(e)}), will retry next sync`);
      return null;
    });
    if (!c) return null;
    return {
      source: "hackerrank",
      slug: r.slug,
      title: r.title,
      url: r.url,
      lcNumber: null,
      difficulty: normalizeDifficulty(c.difficulty),
      topicId: topicFromHackerRank(c.subdomain, c.domain),
      tags: [c.domain, c.subdomain].filter((x): x is string => !!x),
      solvedAt: r.solvedAt,
      solvedDate: istDate(r.solvedAt),
    };
  });
  return rows.filter((x): x is NewSolve => x !== null);
}

/**
 * Pull new accepted solves from every connected platform and store them.
 * Safe to run concurrently: (source, slug) is unique, duplicates are ignored.
 */
export async function syncAll(): Promise<SyncResult> {
  const settings = await loadSettings();
  const db = getDb();
  const errors: string[] = [];
  const rows: NewSolve[] = [];
  let totals: PlatformTotals | null = settings.leetcodeTotals;

  const lc = settings.leetcodeUsername?.trim();
  const hr = settings.hackerrankUsername?.trim();

  await Promise.all([
    lc
      ? syncLeetCode(lc, (m) => errors.push(m))
          .then((r) => {
            rows.push(...r.rows);
            totals = r.totals;
          })
          .catch((e) => errors.push(`LeetCode: ${message(e)}`))
      : null,
    hr
      ? syncHackerRank(hr, (m) => errors.push(m))
          .then((r) => rows.push(...r))
          .catch((e) => errors.push(`HackerRank: ${message(e)}`))
      : null,
  ]);

  let added: { title: string }[] = [];
  if (rows.length) {
    added = await db
      .insert(schema.solves)
      .values(rows)
      .onConflictDoNothing({ target: [schema.solves.source, schema.solves.slug] })
      .returning({ title: schema.solves.title });
  }

  const now = new Date();
  const state = { lastSyncedAt: now, lastSyncError: errors.length ? errors.join(" · ") : null, leetcodeTotals: totals, updatedAt: now };
  await db
    .insert(schema.settings)
    .values({ id: 1, startDate: settings.startDate, endDate: settings.endDate, practiceEndDate: settings.practiceEndDate, ...state })
    .onConflictDoUpdate({ target: schema.settings.id, set: state });

  return { added: added.length, addedTitles: added.map((a) => a.title), errors, ranAt: now.toISOString() };
}

export function isStale(lastSyncedAt: Date | null): boolean {
  return !lastSyncedAt || Date.now() - lastSyncedAt.getTime() > STALE_MS;
}
