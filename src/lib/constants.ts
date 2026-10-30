import type { DayStatus, DayType, Difficulty, How, Priority, Status } from "@/db/schema";

export const PLAN_DAYS = 112;
export const PLAN_WEEKS = 16;
export const REDO_STAGES = [1, 7, 30] as const;
export type RedoStage = (typeof REDO_STAGES)[number];

export const STATUSES: Status[] = ["not_started", "attempted", "solved", "revised"];
export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
export const HOWS: How[] = ["alone", "hint", "solution"];
export const DAY_STATUSES: DayStatus[] = ["yes", "partial", "skipped"];

export const STATUS_LABEL: Record<Status, string> = {
  not_started: "Not started",
  attempted: "Attempted",
  solved: "Solved",
  revised: "Revised",
};

export const STATUS_SHORT: Record<Status, string> = {
  not_started: "Todo",
  attempted: "Tried",
  solved: "Solved",
  revised: "Revised",
};

/** Tailwind classes built from theme tokens (never raw hex in components). */
export const STATUS_CLASS: Record<Status, { text: string; bg: string; dot: string; border: string }> = {
  not_started: {
    text: "text-muted-foreground",
    bg: "bg-status-not-started/20",
    dot: "bg-status-not-started",
    border: "border-status-not-started/50",
  },
  attempted: {
    text: "text-status-attempted",
    bg: "bg-status-attempted/15",
    dot: "bg-status-attempted",
    border: "border-status-attempted/50",
  },
  solved: {
    text: "text-status-solved",
    bg: "bg-status-solved/15",
    dot: "bg-status-solved",
    border: "border-status-solved/50",
  },
  revised: {
    text: "text-status-revised",
    bg: "bg-status-revised/15",
    dot: "bg-status-revised",
    border: "border-status-revised/50",
  },
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export const DIFFICULTY_SHORT: Record<Difficulty, string> = { easy: "E", medium: "M", hard: "H" };

export const DIFFICULTY_CLASS: Record<Difficulty, { text: string; bg: string; fill: string }> = {
  easy: { text: "text-easy", bg: "bg-easy/15", fill: "bg-easy" },
  medium: { text: "text-medium", bg: "bg-medium/15", fill: "bg-medium" },
  hard: { text: "text-hard", bg: "bg-hard/15", fill: "bg-hard" },
};

/** CSS variable references for charts (SVG fills need real colour values). */
export const CHART_COLOR = {
  accent: "var(--accent)",
  planned: "var(--chart-planned)",
  grid: "var(--chart-grid)",
  muted: "var(--muted-foreground)",
  easy: "var(--easy)",
  medium: "var(--medium)",
  hard: "var(--hard)",
  solved: "var(--status-solved)",
  attempted: "var(--status-attempted)",
  revised: "var(--status-revised)",
} as const;

export const HOW_LABEL: Record<How, string> = {
  alone: "Alone",
  hint: "Hint",
  solution: "Solution",
};

export const PRIORITY_CLASS: Record<Priority, string> = {
  P1: "bg-p1/15 text-p1",
  P2: "bg-p2/15 text-p2",
  P3: "bg-p3/15 text-p3",
};

export const DAY_TYPE_LABEL: Record<DayType, string> = {
  study: "Study",
  review: "Review",
  mock: "Mock",
  final: "Final",
};

export const DAY_TYPE_CLASS: Record<DayType, string> = {
  study: "bg-card-hover text-muted-foreground",
  review: "bg-p3/15 text-p3",
  mock: "bg-hard/15 text-hard",
  final: "bg-accent/15 text-accent",
};

export const DAY_STATUS_LABEL: Record<DayStatus, string> = {
  yes: "Done",
  partial: "Partial",
  skipped: "Skipped",
};

export const DAY_STATUS_CLASS: Record<DayStatus, string> = {
  yes: "bg-status-solved/15 text-status-solved border-status-solved/40",
  partial: "bg-status-attempted/15 text-status-attempted border-status-attempted/40",
  skipped: "bg-hard/15 text-hard border-hard/40",
};

export const TOPIC_STATUS_CLASS = {
  "Not started": "text-muted-foreground",
  "In progress": "text-medium",
  Completed: "text-easy",
} as const;
