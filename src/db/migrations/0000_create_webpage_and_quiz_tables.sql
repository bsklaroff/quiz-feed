CREATE TABLE "quiz" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"items" json NOT NULL,
	"source_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webpage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"text" text NOT NULL,
	"favicon" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quiz" ADD CONSTRAINT "quiz_source_id_webpage_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."webpage"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "webpage_url_index" ON "webpage" USING btree ("url");