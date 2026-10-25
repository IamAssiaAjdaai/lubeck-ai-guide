// Schema-compatible SQL *preview* of the fictional fixture. Does not connect to Neon.
// No production or existing Preview data is altered. Review before executing anywhere.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const fixture=JSON.parse(await readFile(new URL("./fixtures/synthetic-preview.json",import.meta.url),"utf8"));
const quote=(s)=>"'"+String(s).replaceAll("'","''")+"'";
assert.equal(fixture.attestation,"synthetic-content-authored-for-testing-only");
assert.equal(fixture.city.id,"fictional-demo-city");
assert.equal(fixture.places.length,3);
assert.deepEqual(fixture.sourceUrls,[]);
assert.deepEqual(fixture.media,[]);
assert.deepEqual(fixture.users,[]);
const sql=[
  "-- REVIEW ONLY: For a brand-new, empty, separately approved database with schema already applied.",
  "-- Never run against an existing Neon Preview or Production branch.",
  "BEGIN;",
  "-- Fail rather than mix fictional test data with existing content.",
  "DO $$ BEGIN IF (SELECT count(*) FROM public.cities) <> 0 OR (SELECT count(*) FROM public.places) <> 0 OR (SELECT count(*) FROM public.place_localizations) <> 0 THEN RAISE EXCEPTION 'Non-empty city/place dataset. Refusing seed.'; END IF; END $$;",
  `INSERT INTO public.cities (slug,name,publication_status) VALUES (${quote(fixture.city.id)},${quote(fixture.city.name)},'published');`,
  ...fixture.places.map(p=>{
     assert.match(p.id,/^demo-[1-9][0-9]*$/);
     assert.ok(Number.isFinite(p.latitude)&&Number.isFinite(p.longitude));
     return `INSERT INTO public.places (city_id,slug,category,latitude,longitude,duration_minutes,environment,pricing,tags,publication_status) SELECT id,${quote(p.id)},'see',${p.latitude},${p.longitude},10,'outdoor','free',ARRAY['fictional','test-only']::text[],'published' FROM public.cities WHERE slug=${quote(fixture.city.id)};`;
  }),
  ...fixture.places.map(p=>`INSERT INTO public.place_localizations (place_id,locale,name,short_description,facts) SELECT id,'en',${quote(p.name)},${quote(p.description)},'[]'::jsonb FROM public.places WHERE slug=${quote(p.id)} AND city_id=(SELECT id FROM public.cities WHERE slug=${quote(fixture.city.id)});`),
  "COMMIT;"
];
process.stdout.write(sql.join("\n")+"\n");
