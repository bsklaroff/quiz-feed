ALTER TABLE "quiz" ADD COLUMN "slug" text;--> statement-breakpoint
UPDATE "quiz" SET "slug" = "id"::text WHERE "slug" IS NULL;--> statement-breakpoint
ALTER TABLE "quiz" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "quiz" ADD CONSTRAINT "quiz_parent_id_quiz_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."quiz"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz" ADD CONSTRAINT "quiz_slug_unique" UNIQUE("slug");
