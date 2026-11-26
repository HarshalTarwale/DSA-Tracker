import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchHackerRankChallenge, fetchHackerRankRecent } from "@/server/sync/hackerrank";
import { fetchLeetCodeProfile, fetchLeetCodeQuestion, SyncError } from "@/server/sync/leetcode";

function stubFetch(handler: (url: string, init?: RequestInit) => { status?: number; body: unknown }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const r = handler(String(url), init);
      return new Response(JSON.stringify(r.body), { status: r.status ?? 200, headers: { "content-type": "application/json" } });
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("LeetCode", () => {
  it("reads recent accepted solves and difficulty totals", async () => {
    stubFetch(() => ({
      body: {
        data: {
          matchedUser: {
            submitStatsGlobal: {
              acSubmissionNum: [
                { difficulty: "All", count: 12 },
                { difficulty: "Easy", count: 7 },
                { difficulty: "Medium", count: 4 },
                { difficulty: "Hard", count: 1 },
              ],
            },
          },
          recentAcSubmissionList: [{ title: "Two Sum", titleSlug: "two-sum", timestamp: "1796083200" }],
        },
      },
    }));
    const r = await fetchLeetCodeProfile("someone");
    expect(r.totals).toEqual({ all: 12, easy: 7, medium: 4, hard: 1 });
    expect(r.recent).toEqual([{ slug: "two-sum", title: "Two Sum", solvedAt: new Date(1796083200 * 1000) }]);
  });

  it("reports a missing user clearly", async () => {
    stubFetch(() => ({ body: { data: { matchedUser: null, recentAcSubmissionList: [] }, errors: [{ message: "That user does not exist." }] } }));
    await expect(fetchLeetCodeProfile("nobody")).rejects.toThrow(/not found/);
    await expect(fetchLeetCodeProfile("nobody")).rejects.toBeInstanceOf(SyncError);
  });

  it("reads a question's difficulty and tags", async () => {
    stubFetch(() => ({
      body: { data: { question: { title: "3Sum", questionFrontendId: "15", difficulty: "Medium", topicTags: [{ slug: "array" }, { slug: "two-pointers" }] } } },
    }));
    expect(await fetchLeetCodeQuestion("3sum")).toEqual({ title: "3Sum", lcNumber: 15, difficulty: "Medium", tags: ["array", "two-pointers"] });
  });
});

describe("HackerRank", () => {
  it("pages through recent challenges and stops at known ones", async () => {
    const pages: Record<string, unknown> = {
      first: {
        models: [
          { ch_slug: "new-one", name: "New One", url: "/challenges/new-one", con_slug: "master", created_at: "2026-12-02T10:00:00.000Z" },
        ],
        cursor: "c2",
        last_page: false,
      },
      c2: {
        models: [{ ch_slug: "old-one", name: "Old One", url: "/challenges/old-one", con_slug: "master", created_at: "2026-11-01T10:00:00.000Z" }],
        cursor: "c3",
        last_page: false,
      },
    };
    const seen: string[] = [];
    stubFetch((url) => {
      seen.push(url);
      const cursor = new URL(url).searchParams.get("cursor") ?? "first";
      return { body: pages[cursor] ?? { models: [], last_page: true } };
    });
    const r = await fetchHackerRankRecent("me", new Set(["old-one"]));
    expect(r.map((x) => x.slug)).toEqual(["new-one", "old-one"]);
    expect(r[0].url).toBe("https://www.hackerrank.com/challenges/new-one");
    expect(seen).toHaveLength(2); // stopped after the page containing a known slug
  });

  it("treats a 404 on the first page as an unknown user", async () => {
    stubFetch(() => ({ status: 404, body: { error: "Not Found" } }));
    await expect(fetchHackerRankRecent("ghost", new Set())).rejects.toThrow(/not found/);
  });

  it("reads difficulty and track from a challenge", async () => {
    stubFetch(() => ({
      body: { model: { difficulty_name: "Easy", track: { slug: "arrays", track_slug: "data-structures" } } },
    }));
    expect(await fetchHackerRankChallenge("master", "2d-array")).toEqual({ difficulty: "Easy", subdomain: "arrays", domain: "data-structures" });
  });
});
