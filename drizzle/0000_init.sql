CREATE TYPE "public"."day_status_enum" AS ENUM('yes', 'partial', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."day_type_enum" AS ENUM('study', 'review', 'mock', 'final');--> statement-breakpoint
CREATE TYPE "public"."difficulty_enum" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TYPE "public"."event_type_enum" AS ENUM('status_change', 'redo_done');--> statement-breakpoint
CREATE TYPE "public"."how_enum" AS ENUM('alone', 'hint', 'solution');--> statement-breakpoint
CREATE TYPE "public"."priority_enum" AS ENUM('P1', 'P2', 'P3');--> statement-breakpoint
CREATE TYPE "public"."status_enum" AS ENUM('not_started', 'attempted', 'solved', 'revised');--> statement-breakpoint
CREATE TABLE "activity_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"event_date" date NOT NULL,
	"problem_id" integer NOT NULL,
	"type" "event_type_enum" NOT NULL,
	"from_status" "status_enum",
	"to_status" "status_enum",
	"redo_stage" integer
);
--> statement-breakpoint
CREATE TABLE "day_logs" (
	"day_index" integer PRIMARY KEY NOT NULL,
	"status" "day_status_enum",
	"hours_spent" numeric(4, 1),
	"notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mistakes" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"problem_id" integer,
	"problem_title" text,
	"topic_id" text,
	"trigger" text,
	"what_went_wrong" text,
	"correct_idea" text,
	"resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mock_tests" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"title" text NOT NULL,
	"attempted" integer NOT NULL,
	"solved" integer NOT NULL,
	"duration_minutes" integer,
	"topic_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"what_went_wrong" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "problems" (
	"id" serial PRIMARY KEY NOT NULL,
	"lc_number" integer,
	"order" integer NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"difficulty" "difficulty_enum" NOT NULL,
	"topic_id" text NOT NULL,
	"key_idea" text,
	"is_custom" boolean DEFAULT false NOT NULL,
	"status" "status_enum" DEFAULT 'not_started' NOT NULL,
	"solved_at" date,
	"how" "how_enum",
	"time_minutes" integer,
	"redo_flag" boolean DEFAULT false NOT NULL,
	"redo1_done_at" date,
	"redo7_done_at" date,
	"redo30_done_at" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "problems_lc_number_unique" UNIQUE("lc_number")
);
--> statement-breakpoint
CREATE TABLE "schedule_day_problems" (
	"day_index" integer NOT NULL,
	"problem_id" integer NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "schedule_day_problems_day_index_problem_id_pk" PRIMARY KEY("day_index","problem_id")
);
--> statement-breakpoint
CREATE TABLE "schedule_days" (
	"day_index" integer PRIMARY KEY NOT NULL,
	"type" "day_type_enum" NOT NULL,
	"phase" text NOT NULL,
	"topic_id" text,
	"title" text NOT NULL,
	"focus" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"start_date" date NOT NULL,
	"daily_hours" integer DEFAULT 3 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_singleton" CHECK ("settings"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" text PRIMARY KEY NOT NULL,
	"order" integer NOT NULL,
	"name" text NOT NULL,
	"priority" "priority_enum" NOT NULL,
	"phase" text NOT NULL,
	"planned_days" integer NOT NULL,
	"importance_a" integer DEFAULT 0 NOT NULL,
	"importance_b" integer DEFAULT 0 NOT NULL,
	"importance_c" integer DEFAULT 0 NOT NULL,
	"daily_focus" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mistakes" ADD CONSTRAINT "mistakes_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mistakes" ADD CONSTRAINT "mistakes_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problems" ADD CONSTRAINT "problems_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_day_problems" ADD CONSTRAINT "schedule_day_problems_day_index_schedule_days_day_index_fk" FOREIGN KEY ("day_index") REFERENCES "public"."schedule_days"("day_index") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_day_problems" ADD CONSTRAINT "schedule_day_problems_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_days" ADD CONSTRAINT "schedule_days_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_events_date_idx" ON "activity_events" USING btree ("event_date");--> statement-breakpoint
CREATE INDEX "mistakes_date_idx" ON "mistakes" USING btree ("date");--> statement-breakpoint
CREATE INDEX "problems_topic_idx" ON "problems" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "problems_status_idx" ON "problems" USING btree ("status");--> statement-breakpoint
CREATE INDEX "problems_solved_at_idx" ON "problems" USING btree ("solved_at");--> statement-breakpoint
CREATE INDEX "sdp_problem_idx" ON "schedule_day_problems" USING btree ("problem_id");