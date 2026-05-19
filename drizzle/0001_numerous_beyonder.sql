CREATE TABLE "reading_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"date" date NOT NULL,
	"surah_id" integer NOT NULL,
	"verses_read" integer DEFAULT 0 NOT NULL,
	"minutes_read" integer DEFAULT 0 NOT NULL,
	"pages_read" integer DEFAULT 0 NOT NULL,
	"first_verse_key" varchar(50),
	"last_verse_key" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
