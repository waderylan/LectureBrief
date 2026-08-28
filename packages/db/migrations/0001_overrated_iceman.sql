ALTER TABLE "lectures" ADD COLUMN "callbacks" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "lectures" ADD COLUMN "glossary" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "lectures" ADD COLUMN "announcements" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "lectures" ADD COLUMN "open_questions" jsonb NOT NULL;