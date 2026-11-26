import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * The database only stores what changes: your settings and the problems you have
 * solved (pulled automatically from LeetCode / HackerRank). Topics, targets and the
 * day-by-day plan come from data/seed-data.json and src/lib/*.
 */

export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);
export const sourceEnum = pgEnum("solve_source", ["leetcode", "hackerrank", "manual"]);

export interface PlatformTotals {
  all: number;
  easy: number;
  medium: number;
  hard: number;
}

export const settings = pgTable(
  "settings",
  {
    id: integer("id").primaryKey().default(1),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    practiceEndDate: date("practice_end_date", { mode: "string" }).notNull(),
    leetcodeUsername: text("leetcode_username"),
    hackerrankUsername: text("hackerrank_username"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    lastSyncError: text("last_sync_error"),
    /** totals from the LeetCode profile at the last sync */
    leetcodeTotals: jsonb("leetcode_totals").$type<PlatformTotals>(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [check("settings_singleton", sql`${t.id} = 1`)],
);

export const solves = pgTable(
  "solves",
  {
    id: serial("id").primaryKey(),
    source: sourceEnum("source").notNull(),
    /** platform slug, e.g. "two-sum" (manual entries get a generated slug) */
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    url: text("url"),
    lcNumber: integer("lc_number"),
    difficulty: difficultyEnum("difficulty").notNull(),
    /** null = not a DSA topic we track (e.g. SQL) */
    topicId: text("topic_id"),
    /** true once you changed the topic by hand; sync never overwrites it */
    topicLocked: boolean("topic_locked").notNull().default(false),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    /** first accepted submission */
    solvedAt: timestamp("solved_at", { withTimezone: true }).notNull(),
    /** IST calendar date of solvedAt */
    solvedDate: date("solved_date", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("solves_source_slug_idx").on(t.source, t.slug),
    index("solves_date_idx").on(t.solvedDate),
    index("solves_topic_idx").on(t.topicId),
  ],
);

export type Settings = typeof settings.$inferSelect;
export type Solve = typeof solves.$inferSelect;
export type Difficulty = (typeof difficultyEnum.enumValues)[number];
export type Source = (typeof sourceEnum.enumValues)[number];
export type Priority = "P1" | "P2" | "P3";
