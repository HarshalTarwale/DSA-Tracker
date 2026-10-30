import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const priorityEnum = pgEnum("priority_enum", ["P1", "P2", "P3"]);
export const difficultyEnum = pgEnum("difficulty_enum", ["easy", "medium", "hard"]);
export const statusEnum = pgEnum("status_enum", ["not_started", "attempted", "solved", "revised"]);
export const howEnum = pgEnum("how_enum", ["alone", "hint", "solution"]);
export const dayTypeEnum = pgEnum("day_type_enum", ["study", "review", "mock", "final"]);
export const dayStatusEnum = pgEnum("day_status_enum", ["yes", "partial", "skipped"]);
export const eventTypeEnum = pgEnum("event_type_enum", ["status_change", "redo_done"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const settings = pgTable(
  "settings",
  {
    id: integer("id").primaryKey().default(1),
    startDate: date("start_date", { mode: "string" }).notNull(),
    dailyHours: integer("daily_hours").notNull().default(3),
    ...timestamps,
  },
  (t) => [check("settings_singleton", sql`${t.id} = 1`)],
);

export const topics = pgTable("topics", {
  id: text("id").primaryKey(),
  order: integer("order").notNull(),
  name: text("name").notNull(),
  priority: priorityEnum("priority").notNull(),
  phase: text("phase").notNull(),
  plannedDays: integer("planned_days").notNull(),
  importanceA: integer("importance_a").notNull().default(0),
  importanceB: integer("importance_b").notNull().default(0),
  importanceC: integer("importance_c").notNull().default(0),
  dailyFocus: jsonb("daily_focus").$type<string[]>().notNull().default([]),
});

export const problems = pgTable(
  "problems",
  {
    id: serial("id").primaryKey(),
    lcNumber: integer("lc_number").unique(),
    order: integer("order").notNull(),
    title: text("title").notNull(),
    url: text("url"),
    difficulty: difficultyEnum("difficulty").notNull(),
    topicId: text("topic_id")
      .notNull()
      .references(() => topics.id),
    keyIdea: text("key_idea"),
    isCustom: boolean("is_custom").notNull().default(false),
    status: statusEnum("status").notNull().default("not_started"),
    solvedAt: date("solved_at", { mode: "string" }),
    how: howEnum("how"),
    timeMinutes: integer("time_minutes"),
    redoFlag: boolean("redo_flag").notNull().default(false),
    redo1DoneAt: date("redo1_done_at", { mode: "string" }),
    redo7DoneAt: date("redo7_done_at", { mode: "string" }),
    redo30DoneAt: date("redo30_done_at", { mode: "string" }),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("problems_topic_idx").on(t.topicId),
    index("problems_status_idx").on(t.status),
    index("problems_solved_at_idx").on(t.solvedAt),
  ],
);

export const scheduleDays = pgTable("schedule_days", {
  dayIndex: integer("day_index").primaryKey(),
  type: dayTypeEnum("type").notNull(),
  phase: text("phase").notNull(),
  topicId: text("topic_id").references(() => topics.id),
  title: text("title").notNull(),
  focus: text("focus").notNull(),
});

export const scheduleDayProblems = pgTable(
  "schedule_day_problems",
  {
    dayIndex: integer("day_index")
      .notNull()
      .references(() => scheduleDays.dayIndex, { onDelete: "cascade" }),
    problemId: integer("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.dayIndex, t.problemId] }),
    index("sdp_problem_idx").on(t.problemId),
  ],
);

/** Keyed by dayIndex only (no FK) so logs survive a schedule rebuild. */
export const dayLogs = pgTable("day_logs", {
  dayIndex: integer("day_index").primaryKey(),
  status: dayStatusEnum("status"),
  hoursSpent: numeric("hours_spent", { precision: 4, scale: 1, mode: "number" }),
  notes: text("notes"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const activityEvents = pgTable(
  "activity_events",
  {
    id: serial("id").primaryKey(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
    eventDate: date("event_date", { mode: "string" }).notNull(),
    problemId: integer("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    type: eventTypeEnum("type").notNull(),
    fromStatus: statusEnum("from_status"),
    toStatus: statusEnum("to_status"),
    redoStage: integer("redo_stage"),
  },
  (t) => [index("activity_events_date_idx").on(t.eventDate)],
);

export const mistakes = pgTable(
  "mistakes",
  {
    id: serial("id").primaryKey(),
    date: date("date", { mode: "string" }).notNull(),
    problemId: integer("problem_id").references(() => problems.id, { onDelete: "set null" }),
    problemTitle: text("problem_title"),
    topicId: text("topic_id").references(() => topics.id),
    trigger: text("trigger"),
    whatWentWrong: text("what_went_wrong"),
    correctIdea: text("correct_idea"),
    resolved: boolean("resolved").notNull().default(false),
    ...timestamps,
  },
  (t) => [index("mistakes_date_idx").on(t.date)],
);

export const mockTests = pgTable("mock_tests", {
  id: serial("id").primaryKey(),
  date: date("date", { mode: "string" }).notNull(),
  title: text("title").notNull(),
  attempted: integer("attempted").notNull(),
  solved: integer("solved").notNull(),
  durationMinutes: integer("duration_minutes"),
  topicIds: text("topic_ids")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  whatWentWrong: text("what_went_wrong"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Topic = typeof topics.$inferSelect;
export type Problem = typeof problems.$inferSelect;
export type ScheduleDay = typeof scheduleDays.$inferSelect;
export type DayLog = typeof dayLogs.$inferSelect;
export type ActivityEvent = typeof activityEvents.$inferSelect;
export type Mistake = typeof mistakes.$inferSelect;
export type MockTest = typeof mockTests.$inferSelect;
export type Settings = typeof settings.$inferSelect;

export type Status = (typeof statusEnum.enumValues)[number];
export type Difficulty = (typeof difficultyEnum.enumValues)[number];
export type How = (typeof howEnum.enumValues)[number];
export type DayType = (typeof dayTypeEnum.enumValues)[number];
export type DayStatus = (typeof dayStatusEnum.enumValues)[number];
export type Priority = (typeof priorityEnum.enumValues)[number];
