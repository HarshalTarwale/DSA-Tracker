import type { Difficulty, Priority, Source } from "@/db/schema";
import type { Step } from "./plan";
import type { TopicStatus } from "./progress";

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

/** Tailwind classes built from theme tokens (never raw hex in components). */
export const DIFFICULTY_CLASS: Record<Difficulty, { text: string; bg: string; fill: string }> = {
  easy: { text: "text-easy", bg: "bg-easy/15", fill: "bg-easy" },
  medium: { text: "text-medium", bg: "bg-medium/15", fill: "bg-medium" },
  hard: { text: "text-hard", bg: "bg-hard/15", fill: "bg-hard" },
};

export const PRIORITY_CLASS: Record<Priority, string> = {
  P1: "bg-p1/15 text-p1",
  P2: "bg-p2/15 text-p2",
  P3: "bg-p3/15 text-p3",
};

export const SOURCE_LABEL: Record<Source, string> = {
  leetcode: "LeetCode",
  hackerrank: "HackerRank",
  manual: "Manual",
};

export const SOURCE_CLASS: Record<Source, string> = {
  leetcode: "bg-medium/15 text-medium",
  hackerrank: "bg-easy/15 text-easy",
  manual: "bg-card-hover text-muted-foreground",
};

export const TOPIC_STATUS_CLASS: Record<TopicStatus, { text: string; bar: string }> = {
  "not-started": { text: "text-muted-foreground", bar: "bg-border" },
  learning: { text: "text-medium", bar: "bg-medium" },
  almost: { text: "text-status-revised", bar: "bg-status-revised" },
  mastered: { text: "text-easy", bar: "bg-easy" },
};

export const STEP_LABEL: Record<Step, string> = {
  learn: "Learn",
  practice: "Practice",
  deepen: "Go deeper",
  review: "Weekly review",
  final: "Final revision",
};

export const STEP_CLASS: Record<Step, string> = {
  learn: "bg-accent/15 text-accent",
  practice: "bg-medium/15 text-medium",
  deepen: "bg-hard/15 text-hard",
  review: "bg-p3/15 text-p3",
  final: "bg-easy/15 text-easy",
};
