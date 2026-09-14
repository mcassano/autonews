CREATE TABLE "actors" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"aliases" text[] DEFAULT '{}'::text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"aliases" text[] DEFAULT '{}'::text[] NOT NULL,
	"lat" numeric(8, 5) NOT NULL,
	"lng" numeric(8, 5) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"feed_url" text NOT NULL,
	"region" text NOT NULL,
	"bias_note" text,
	"etag" text,
	"last_modified" text,
	"last_fetched_at" timestamp with time zone,
	CONSTRAINT "sources_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" integer NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"published_at" timestamp with time zone,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cluster_id" uuid,
	"why_it_matters" text,
	"historical_context" text,
	"llm_enriched_at" timestamp with time zone,
	"llm_model_used" text,
	CONSTRAINT "stories_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "story_actors" (
	"story_id" uuid NOT NULL,
	"actor_key" text NOT NULL,
	"source" text NOT NULL,
	CONSTRAINT "story_actors_story_id_actor_key_pk" PRIMARY KEY("story_id","actor_key")
);
--> statement-breakpoint
CREATE TABLE "story_countries" (
	"story_id" uuid NOT NULL,
	"country_code" text NOT NULL,
	"source" text NOT NULL,
	CONSTRAINT "story_countries_story_id_country_code_pk" PRIMARY KEY("story_id","country_code")
);
--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_actors" ADD CONSTRAINT "story_actors_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_actors" ADD CONSTRAINT "story_actors_actor_key_actors_key_fk" FOREIGN KEY ("actor_key") REFERENCES "public"."actors"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_countries" ADD CONSTRAINT "story_countries_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_countries" ADD CONSTRAINT "story_countries_country_code_countries_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."countries"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stories_published_at_idx" ON "stories" USING btree ("published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "stories_title_trgm_idx" ON "stories" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "story_countries_country_code_idx" ON "story_countries" USING btree ("country_code");