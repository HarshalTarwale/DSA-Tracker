CREATE TYPE "public"."difficulty" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TYPE "public"."solve_source" AS ENUM('leetcode', 'hackerrank', 'manual');--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"practice_end_date" date NOT NULL,
	"leetcode_username" text,
	"hackerrank_username" text,
	"last_synced_at" timestamp with time zone,
	"last_sync_error" text,
	"leetcode_totals" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_singleton" CHECK ("settings"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "solves" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" "solve_source" NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"lc_number" integer,
	"difficulty" "difficulty" NOT NULL,
	"topic_id" text,
	"topic_locked" boolean DEFAULT false NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"solved_at" timestamp with time zone NOT NULL,
	"solved_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "solves_source_slug_idx" ON "solves" USING btree ("source","slug");--> statement-breakpoint
CREATE INDEX "solves_date_idx" ON "solves" USING btree ("solved_date");--> statement-breakpoint
CREATE INDEX "solves_topic_idx" ON "solves" USING btree ("topic_id");