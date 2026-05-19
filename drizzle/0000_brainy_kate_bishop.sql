CREATE TYPE "public"."goal_type" AS ENUM('days', 'khatm', 'juz', 'custom');--> statement-breakpoint
CREATE TYPE "public"."journey_type" AS ENUM('living', 'departed', 'personal');--> statement-breakpoint
CREATE TABLE "niyyah_journey_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journey_id" uuid NOT NULL,
	"date" date NOT NULL,
	"verses_read" integer NOT NULL,
	"surah_range" text NOT NULL,
	"start_key" varchar(50) NOT NULL,
	"end_key" varchar(50) NOT NULL,
	"reflection" text,
	"is_mercy" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "niyyah_journeys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"type" "journey_type" NOT NULL,
	"recipient_name" text NOT NULL,
	"occasion" text NOT NULL,
	"personal_dua" text NOT NULL,
	"goal_type" "goal_type" NOT NULL,
	"goal_value" integer NOT NULL,
	"start_date" date NOT NULL,
	"target_date" date NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"mercy_day_used" boolean DEFAULT false NOT NULL,
	"last_mercy_week" varchar(50),
	"is_complete" boolean DEFAULT false NOT NULL,
	"reader_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_collections_meta" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"cover_image_url" varchar(1024)
);
--> statement-breakpoint
CREATE TABLE "user_notes_meta" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"rich_text_content" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "niyyah_journey_days" ADD CONSTRAINT "niyyah_journey_days_journey_id_niyyah_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."niyyah_journeys"("id") ON DELETE cascade ON UPDATE no action;