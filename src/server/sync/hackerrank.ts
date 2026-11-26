import "server-only";
import { SyncError } from "./leetcode";

/**
 * HackerRank's public REST endpoints (used by its profile pages). Unofficial, so
 * every field is read defensively and failures are reported, never thrown at the UI.
 */
const BASE = "https://www.hackerrank.com/rest";
const HEADERS = {
  Accept: "application/json",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36",
};

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: HEADERS, cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (res.status === 404) return null;
  if (!res.ok) throw new SyncError(`HackerRank responded ${res.status}`);
  return res.json();
}

export interface HackerRankRecent {
  slug: string;
  contest: string;
  title: string;
  url: string;
  solvedAt: Date;
}

type Obj = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : undefined);

/** Solved challenges, newest first. Stops early once it reaches slugs we already have. */
export async function fetchHackerRankRecent(username: string, known: Set<string>, maxPages = 10): Promise<HackerRankRecent[]> {
  const out: HackerRankRecent[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const url = `${BASE}/hackers/${encodeURIComponent(username)}/recent_challenges?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}&response_version=v2`;
    const body = (await getJson(url)) as Obj | null;
    if (!body) {
      if (page === 0) throw new SyncError(`HackerRank user "${username}" not found (or profile is private)`);
      break;
    }
    const models = Array.isArray(body.models) ? (body.models as Obj[]) : [];
    let sawKnown = false;
    for (const m of models) {
      const slug = str(m.ch_slug) ?? str(m.slug);
      if (!slug) continue;
      if (known.has(slug)) sawKnown = true;
      const created = str(m.created_at);
      out.push({
        slug,
        contest: str(m.con_slug) ?? "master",
        title: str(m.name) ?? slug,
        url: str(m.url) ? new URL(str(m.url)!, "https://www.hackerrank.com").toString() : `https://www.hackerrank.com/challenges/${slug}`,
        solvedAt: created ? new Date(created) : new Date(),
      });
    }
    cursor = str(body.cursor);
    if (sawKnown || !models.length || body.last_page === true || !cursor) break;
  }
  return out;
}

export interface HackerRankChallenge {
  difficulty: string | undefined;
  subdomain: string | undefined;
  domain: string | undefined;
}

export async function fetchHackerRankChallenge(contest: string, slug: string): Promise<HackerRankChallenge> {
  const body = (await getJson(`${BASE}/contests/${encodeURIComponent(contest)}/challenges/${encodeURIComponent(slug)}`)) as Obj | null;
  const model = (body?.model ?? {}) as Obj;
  const track = (model.track ?? {}) as Obj;
  return {
    difficulty: str(model.difficulty_name),
    subdomain: str(track.slug),
    domain: str(track.track_slug),
  };
}
