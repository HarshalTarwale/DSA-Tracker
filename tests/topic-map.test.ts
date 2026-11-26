import { describe, expect, it } from "vitest";
import { topics } from "@/lib/content";
import { TOPIC_TARGETS } from "@/lib/targets";
import { normalizeDifficulty, topicFromHackerRank, topicFromLeetCodeTags } from "@/lib/topic-map";

describe("LeetCode tags → topic", () => {
  it.each([
    [["array", "hash-table"], "hashing"], // Two Sum
    [["hash-table", "string", "sliding-window"], "sliding-window"], // Longest Substring Without Repeating
    [["array", "depth-first-search", "breadth-first-search", "union-find", "matrix"], "graphs-bfs-dfs-grids"], // Number of Islands
    [["hash-table", "linked-list", "design", "doubly-linked-list"], "design-lru-lfu"], // LRU Cache
    [["math", "dynamic-programming", "memoization"], "dp-1d-grid"], // Climbing Stairs
    [["string", "dynamic-programming"], "dp-strings-advanced"], // LCS
    [["tree", "depth-first-search", "binary-tree"], "trees-bst"], // Max Depth
    [["linked-list", "recursion"], "linked-list"], // Reverse Linked List
    [["array", "two-pointers", "sorting"], "two-pointers"], // 3Sum
    [["graph", "topological-sort", "depth-first-search"], "graphs-topo-sort-union-find"], // Course Schedule
    [["array", "sorting"], "sorting-intervals"], // Merge Intervals
    [["string", "trie", "design"], "trie"], // Implement Trie
    [["array"], "arrays-matrix"],
  ])("%j → %s", (tags, topic) => {
    expect(topicFromLeetCodeTags(tags)).toBe(topic);
  });

  it("ignores SQL and untagged problems", () => {
    expect(topicFromLeetCodeTags(["database"])).toBeNull();
    expect(topicFromLeetCodeTags([])).toBeNull();
  });

  it("only ever returns real topic ids", () => {
    const ids = new Set(topics.map((t) => t.id));
    for (const tags of [["greedy"], ["bit-manipulation"], ["heap-priority-queue"], ["stack"], ["prefix-sum"], ["binary-search"], ["math"], ["shortest-path"]]) {
      expect(ids.has(topicFromLeetCodeTags(tags)!)).toBe(true);
    }
    expect(Object.keys(TOPIC_TARGETS).sort()).toEqual([...ids].sort());
  });
});

describe("HackerRank tracks → topic", () => {
  it("maps tracks and domains", () => {
    expect(topicFromHackerRank("arrays", "data-structures")).toBe("arrays-matrix");
    expect(topicFromHackerRank("linked-lists", "data-structures")).toBe("linked-list");
    expect(topicFromHackerRank("py-introduction", "python")).toBe("python-big-o-basic-logic");
    expect(topicFromHackerRank("select", "sql")).toBeNull();
    expect(topicFromHackerRank("something-new", "algorithms")).toBe("arrays-matrix");
  });

  it("normalises difficulty names", () => {
    expect(normalizeDifficulty("Easy")).toBe("easy");
    expect(normalizeDifficulty("Medium")).toBe("medium");
    expect(normalizeDifficulty("Advanced")).toBe("hard");
    expect(normalizeDifficulty("Expert")).toBe("hard");
  });
});
