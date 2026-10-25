// Offline synthetic fixture integrity gate. No database, networking, deployment or runtime pin changes.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const fixturePath = new URL("./fixtures/synthetic-preview.json", import.meta.url);
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
assert.equal(fixture.schemaVersion, 1);
assert.equal(fixture.purpose, "offline-native-preview-synthetic-fixture");
assert.equal(fixture.attestation, "synthetic-content-authored-for-testing-only");
assert.equal(fixture.city.id, "fictional-demo-city");
assert.ok(Array.isArray(fixture.places) && fixture.places.length === 3);
const ids = new Set();
for (const place of fixture.places) {
  assert.match(place.id, /^demo-[1-9][0-9]*$/);
  assert.ok(!ids.has(place.id), "Duplicate fixture ID");
  ids.add(place.id);
  assert.equal(typeof place.name, "string");
  assert.ok(place.name.length > 0 && place.name.length <= 100);
  assert.equal(typeof place.description, "string");
  assert.ok(place.description.length > 0 && place.description.length <= 500);
  assert.ok(Number.isFinite(place.latitude) && Number.isFinite(place.longitude));
  assert.ok(Math.abs(place.latitude) < 1 && Math.abs(place.longitude) < 1, "Fixture coordinates must not resemble real Lübeck coordinates");
}
for (const name of ["sourceUrls", "media", "users", "sessions", "commerce"]) {
  assert.deepEqual(fixture[name], [], `${name} must be empty in this fixture`);
}
assert.deepEqual(Object.keys(fixture).sort(), ["attestation", "city", "commerce", "media", "places", "purpose", "schemaVersion", "sessions", "sourceUrls", "users"].sort());
console.log("PASS: isolated offline synthetic fixture; no real-user, source, or media records.");
