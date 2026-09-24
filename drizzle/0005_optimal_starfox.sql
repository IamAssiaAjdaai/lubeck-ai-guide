CREATE TABLE "place_revisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"place_id" integer NOT NULL,
	"revision_number" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"published_by_user_id" text,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "place_revisions" ADD CONSTRAINT "place_revisions_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "place_revisions_place_number_unique" ON "place_revisions" USING btree ("place_id","revision_number");--> statement-breakpoint
CREATE INDEX "place_revisions_place_current_idx" ON "place_revisions" USING btree ("place_id","is_current");--> statement-breakpoint
INSERT INTO "place_revisions" (
	"place_id",
	"revision_number",
	"snapshot",
	"is_current",
	"published_by_user_id",
	"published_at"
)
SELECT
	p."id",
	1,
	jsonb_strip_nulls(jsonb_build_object(
		'category', p."category",
		'latitude', p."latitude",
		'longitude', p."longitude",
		'durationMinutes', p."duration_minutes",
		'environment', p."environment",
		'pricing', p."pricing",
		'status', p."status",
		'statusVerifiedAt', p."status_verified_at",
		'visitNoteVerifiedAt', p."visit_note_verified_at",
		'visitNoteValidUntil', p."visit_note_valid_until",
		'image', p."image",
		'tagSlugs', to_jsonb(p."tags"),
		'localizations', COALESCE((
			SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
				'locale', localization."locale",
				'name', localization."name",
				'shortDescription', localization."short_description",
				'description', localization."description",
				'story', localization."story",
				'visitNotes', localization."visit_notes",
				'facts', localization."facts"
			)) ORDER BY localization."locale")
			FROM "place_localizations" localization
			WHERE localization."place_id" = p."id"
		), '[]'::jsonb)
	)),
	true,
	p."updated_by_user_id",
	p."updated_at"
FROM "places" p
WHERE p."publication_status" = 'published'
	AND NOT EXISTS (
		SELECT 1 FROM "place_revisions" revision
		WHERE revision."place_id" = p."id"
	);
