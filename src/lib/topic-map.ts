/**
 * Decide which of the 25 plan topics a solved problem belongs to.
 * Problems in the curated plan list keep their curated topic; everything else is
 * classified from platform tags, most specific technique first (a "Two Sum" tagged
 * array + hash-table counts as Hashing, not Arrays). You can override it per solve.
 */

type Rule = [topicId: string, test: (t: Set<string>) => boolean];

const has = (...tags: string[]) => (t: Set<string>) => tags.some((x) => t.has(x));

const LEETCODE_RULES: Rule[] = [
  ["trie", has("trie")],
  ["graphs-topo-sort-union-find", has("topological-sort")],
  ["graphs-shortest-path-mst", has("shortest-path", "minimum-spanning-tree")],
  ["design-lru-lfu", (t) => t.has("design") && !t.has("tree") && !t.has("binary-tree")],
  ["dp-strings-advanced", (t) => (t.has("dynamic-programming") || t.has("memoization")) && (t.has("string") || t.has("bitmask"))],
  ["dp-1d-grid", has("dynamic-programming", "memoization")],
  ["trees-bst", has("binary-tree", "tree", "binary-search-tree")],
  ["graphs-bfs-dfs-grids", has("graph", "breadth-first-search", "depth-first-search")],
  ["graphs-topo-sort-union-find", has("union-find")],
  ["heap-priority-queue", has("heap-priority-queue")],
  ["linked-list", has("linked-list", "doubly-linked-list")],
  ["recursion-backtracking", has("backtracking", "recursion")],
  ["stack-queue", has("stack", "monotonic-stack", "queue", "monotonic-queue")],
  ["sliding-window", has("sliding-window")],
  ["binary-search", has("binary-search")],
  ["two-pointers", has("two-pointers")],
  ["prefix-sum-subarrays", has("prefix-sum")],
  ["greedy", has("greedy")],
  ["bit-manipulation", has("bit-manipulation", "bitmask")],
  ["hashing", has("hash-table", "counting", "hash-function")],
  ["sorting-intervals", has("sorting", "merge-sort", "line-sweep", "bucket-sort", "counting-sort")],
  ["math-number-theory", has("math", "number-theory", "combinatorics", "geometry")],
  ["strings", has("string", "string-matching")],
  ["arrays-matrix", has("array", "matrix", "simulation", "enumeration")],
];

/** LeetCode tag slugs → topic id, or null for non-DSA (SQL, shell, concurrency). */
export function topicFromLeetCodeTags(tags: string[]): string | null {
  const set = new Set(tags);
  if (set.has("database") || set.has("shell") || set.has("concurrency") || set.has("pandas")) return null;
  for (const [topic, test] of LEETCODE_RULES) if (test(set)) return topic;
  return tags.length ? "arrays-matrix" : null;
}

const HACKERRANK_TRACKS: Record<string, string> = {
  arrays: "arrays-matrix",
  "2d-array": "arrays-matrix",
  "linked-lists": "linked-list",
  trees: "trees-bst",
  "balanced-trees": "trees-bst",
  stacks: "stack-queue",
  queues: "stack-queue",
  heap: "heap-priority-queue",
  "disjoint-set": "graphs-topo-sort-union-find",
  trie: "trie",
  strings: "strings",
  sorting: "sorting-intervals",
  search: "binary-search",
  "graph-theory": "graphs-bfs-dfs-grids",
  greedy: "greedy",
  "dynamic-programming": "dp-1d-grid",
  "bit-manipulation": "bit-manipulation",
  recursion: "recursion-backtracking",
  "constructive-algorithms": "greedy",
  implementation: "arrays-matrix",
  warmup: "python-big-o-basic-logic",
  "fundamentals": "math-number-theory",
  "number-theory": "math-number-theory",
  "combinatorics": "math-number-theory",
};

/**
 * HackerRank track → topic. `subdomain` is e.g. "arrays", `domain` e.g. "data-structures".
 * Everything in the Python domain counts as Python basics.
 */
export function topicFromHackerRank(subdomain: string | undefined, domain: string | undefined): string | null {
  if (domain === "python") return "python-big-o-basic-logic";
  if (domain === "sql" || domain === "databases" || domain === "shell") return null;
  if (subdomain && HACKERRANK_TRACKS[subdomain]) return HACKERRANK_TRACKS[subdomain];
  if (domain === "algorithms" || domain === "data-structures" || domain === "mathematics") {
    return domain === "mathematics" ? "math-number-theory" : "arrays-matrix";
  }
  return null;
}

export function normalizeDifficulty(raw: string | undefined | null): "easy" | "medium" | "hard" {
  const d = (raw ?? "").toLowerCase();
  if (d.startsWith("easy")) return "easy";
  if (d.startsWith("med")) return "medium";
  return d ? "hard" : "medium";
}
