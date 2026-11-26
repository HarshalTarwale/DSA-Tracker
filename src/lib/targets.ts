/**
 * Benchmarks for a Tier C (30–50 LPA) target. These are judgment-based numbers,
 * set so every topic is covered at the depth top product companies ask, with more
 * Medium/Hard where interviews go deep (trees, graphs, DP). Not official data.
 */

export interface DiffTarget {
  easy: number;
  medium: number;
  hard: number;
}

/** Problems to solve (first-time, accepted) to call a topic "mastered". */
export const TOPIC_TARGETS: Record<string, DiffTarget> = {
  "python-big-o-basic-logic": { easy: 8, medium: 3, hard: 0 },
  "arrays-matrix": { easy: 8, medium: 12, hard: 2 },
  strings: { easy: 7, medium: 10, hard: 2 },
  hashing: { easy: 6, medium: 12, hard: 2 },
  "prefix-sum-subarrays": { easy: 3, medium: 8, hard: 2 },
  "two-pointers": { easy: 5, medium: 10, hard: 2 },
  "sliding-window": { easy: 3, medium: 10, hard: 3 },
  "binary-search": { easy: 4, medium: 12, hard: 3 },
  "sorting-intervals": { easy: 3, medium: 8, hard: 1 },
  "linked-list": { easy: 6, medium: 10, hard: 2 },
  "stack-queue": { easy: 4, medium: 10, hard: 3 },
  "recursion-backtracking": { easy: 3, medium: 12, hard: 3 },
  "trees-bst": { easy: 8, medium: 20, hard: 5 },
  "heap-priority-queue": { easy: 2, medium: 10, hard: 3 },
  greedy: { easy: 3, medium: 10, hard: 2 },
  "graphs-bfs-dfs-grids": { easy: 2, medium: 14, hard: 3 },
  "graphs-topo-sort-union-find": { easy: 0, medium: 8, hard: 3 },
  "graphs-shortest-path-mst": { easy: 0, medium: 6, hard: 3 },
  trie: { easy: 1, medium: 4, hard: 2 },
  "dp-1d-grid": { easy: 4, medium: 12, hard: 3 },
  "dp-knapsack-subsequences": { easy: 0, medium: 10, hard: 4 },
  "dp-strings-advanced": { easy: 0, medium: 8, hard: 4 },
  "bit-manipulation": { easy: 4, medium: 5, hard: 1 },
  "math-number-theory": { easy: 4, medium: 4, hard: 1 },
  "design-lru-lfu": { easy: 0, medium: 4, hard: 2 },
};

export function targetFor(topicId: string): DiffTarget {
  return TOPIC_TARGETS[topicId] ?? { easy: 0, medium: 0, hard: 0 };
}

export function totalTarget(): DiffTarget & { total: number } {
  const t = Object.values(TOPIC_TARGETS).reduce(
    (a, b) => ({ easy: a.easy + b.easy, medium: a.medium + b.medium, hard: a.hard + b.hard }),
    { easy: 0, medium: 0, hard: 0 },
  );
  return { ...t, total: t.easy + t.medium + t.hard };
}

/** Extra solves to aim for in the practice phase (after the main plan ends). */
export const PRACTICE_PHASE_TARGET = 120;

export type TierKey = "A" | "B" | "C";

export interface Tier {
  key: TierKey;
  name: string;
  companies: string;
  /** rough fresher CTC band in India; varies a lot by company, year and role */
  packageLpa: string;
  /** topics with importance ≥ this for the tier are required */
  minImportance: number;
  /** fraction of each required topic's mastery target needed */
  bar: number;
  /** rough total solved (all topics) people at this level usually have */
  benchmarkSolved: number;
  interview: string;
}

export const TIERS: Tier[] = [
  {
    key: "A",
    name: "Mass recruiters",
    companies: "TCS, Infosys, Wipro, Cognizant, Capgemini, Accenture",
    packageLpa: "3.5–8 LPA",
    minImportance: 2,
    bar: 0.5,
    benchmarkSolved: 120,
    interview: "Online test with 1–2 Easy/Medium coding questions + aptitude",
  },
  {
    key: "B",
    name: "Product startups & GCCs",
    companies: "Zoho, Freshworks, mid-size product companies, global capability centres",
    packageLpa: "10–25 LPA",
    minImportance: 2,
    bar: 0.75,
    benchmarkSolved: 250,
    interview: "2–3 coding rounds, Medium level, clean code and edge cases",
  },
  {
    key: "C",
    name: "Top product companies",
    companies: "Amazon, Microsoft, Google, Flipkart, Uber, Atlassian",
    packageLpa: "30–50+ LPA",
    minImportance: 2,
    bar: 1,
    benchmarkSolved: 380,
    interview: "3–5 rounds, Medium–Hard: trees, graphs, DP; explain trade-offs aloud",
  },
];

/** YouTube searches on two strong free channels. Search links, not hardcoded videos. */
export function videoLinks(topicName: string): { label: string; url: string }[] {
  const yt = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
  return [
    { label: "take U forward (Striver)", url: yt(`take U forward ${topicName}`) },
    { label: "NeetCode", url: yt(`NeetCode ${topicName}`) },
  ];
}

/** LeetCode problem-list tag page for practising a topic beyond the suggested set. */
export const LEETCODE_TAG: Record<string, string> = {
  "python-big-o-basic-logic": "math",
  "arrays-matrix": "array",
  strings: "string",
  hashing: "hash-table",
  "prefix-sum-subarrays": "prefix-sum",
  "two-pointers": "two-pointers",
  "sliding-window": "sliding-window",
  "binary-search": "binary-search",
  "sorting-intervals": "sorting",
  "linked-list": "linked-list",
  "stack-queue": "stack",
  "recursion-backtracking": "backtracking",
  "trees-bst": "binary-tree",
  "heap-priority-queue": "heap-priority-queue",
  greedy: "greedy",
  "graphs-bfs-dfs-grids": "breadth-first-search",
  "graphs-topo-sort-union-find": "topological-sort",
  "graphs-shortest-path-mst": "shortest-path",
  trie: "trie",
  "dp-1d-grid": "dynamic-programming",
  "dp-knapsack-subsequences": "dynamic-programming",
  "dp-strings-advanced": "dynamic-programming",
  "bit-manipulation": "bit-manipulation",
  "math-number-theory": "number-theory",
  "design-lru-lfu": "design",
};

export function leetcodeTagUrl(topicId: string): string {
  return `https://leetcode.com/problem-list/${LEETCODE_TAG[topicId] ?? "array"}/`;
}
