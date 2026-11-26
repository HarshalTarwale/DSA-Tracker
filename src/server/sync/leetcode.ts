import "server-only";
import type { PlatformTotals } from "@/db/schema";

/**
 * LeetCode's public GraphQL API (the same one the profile page uses). No login is
 * needed for public profiles. `recentAcSubmissionList` returns at most the last 20
 * accepted submissions, so syncing regularly is what keeps the list complete.
 */
const ENDPOINT = "https://leetcode.com/graphql";

export class SyncError extends Error {}

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<{ data: T; errors?: { message: string }[] }> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Referer: "https://leetcode.com",
      "User-Agent": "Mozilla/5.0 (compatible; dsa-tracker/1.0)",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new SyncError(`LeetCode responded ${res.status}`);
  return res.json();
}

export interface LeetCodeRecent {
  slug: string;
  title: string;
  solvedAt: Date;
}

export async function fetchLeetCodeProfile(
  username: string,
): Promise<{ recent: LeetCodeRecent[]; totals: PlatformTotals }> {
  const { data, errors } = await gql<{
    matchedUser: { submitStatsGlobal: { acSubmissionNum: { difficulty: string; count: number }[] } } | null;
    recentAcSubmissionList: { title: string; titleSlug: string; timestamp: string }[] | null;
  }>(
    `query($u: String!) {
      matchedUser(username: $u) { submitStatsGlobal { acSubmissionNum { difficulty count } } }
      recentAcSubmissionList(username: $u, limit: 20) { title titleSlug timestamp }
    }`,
    { u: username },
  );
  if (!data?.matchedUser) {
    const msg = errors?.[0]?.message ?? "";
    throw new SyncError(
      /exist/i.test(msg) ? `LeetCode user "${username}" not found` : `LeetCode: ${msg || "no profile data"}`,
    );
  }
  const n = (d: string) =>
    data.matchedUser!.submitStatsGlobal.acSubmissionNum.find((x) => x.difficulty === d)?.count ?? 0;
  return {
    totals: { all: n("All"), easy: n("Easy"), medium: n("Medium"), hard: n("Hard") },
    recent: (data.recentAcSubmissionList ?? []).map((r) => ({
      slug: r.titleSlug,
      title: r.title,
      solvedAt: new Date(Number(r.timestamp) * 1000),
    })),
  };
}

export interface LeetCodeQuestion {
  title: string;
  lcNumber: number | null;
  difficulty: string;
  tags: string[];
}

export async function fetchLeetCodeQuestion(slug: string): Promise<LeetCodeQuestion> {
  const { data } = await gql<{
    question: {
      title: string;
      questionFrontendId: string;
      difficulty: string;
      topicTags: { slug: string }[];
    } | null;
  }>(
    `query($s: String!) { question(titleSlug: $s) { title questionFrontendId difficulty topicTags { slug } } }`,
    { s: slug },
  );
  if (!data?.question) throw new SyncError(`LeetCode problem "${slug}" not found`);
  const q = data.question;
  const num = Number(q.questionFrontendId);
  return {
    title: q.title,
    lcNumber: Number.isFinite(num) ? num : null,
    difficulty: q.difficulty,
    tags: q.topicTags.map((t) => t.slug),
  };
}
