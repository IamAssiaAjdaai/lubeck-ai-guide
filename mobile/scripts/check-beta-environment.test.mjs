import assert from "node:assert/strict";
import { test } from "node:test";
import { checkBetaEnvironment } from "./check-beta-environment.mjs";
const now = Date.parse("2026-10-18T12:00:00Z");
const profiles = Object.fromEntries(["preview", "store-beta"].map(key => [key, {
  environment: "preview", env: { EXPO_PUBLIC_CITYWALK_ENV: "preview" },
}]));
const approval = {
  origin: "https://citywalk-qa.workers.dev", isolated: true,
  approvalReference: "operator approval reference", databaseEvidence: "isolated QA database review",
  storageEvidence: "isolated QA bucket review", backendCommit: "a".repeat(40),
  expiresAt: "2026-10-19T12:00:00Z",
};
const run = overrides => checkBetaEnvironment({ approval, origin: approval.origin, profile: "preview", profiles, now, ...overrides });
test("accepts an explicit unexpired approval for both beta profiles", () => {
  assert.deepEqual(run(), []);
  assert.deepEqual(run({ profile: "store-beta" }), []);
});
for (const origin of [undefined, "http://citywalk-qa.workers.dev", "https://getcitywalk.com", "https://www.getcitywalk.com", "https://localhost", "https://10.0.0.1", "https://[::ffff:127.0.0.1]", "https://qa.local", "https://qa.invalid", "https://qa.example", "https://qa.workers.dev/path", "https://qa.workers.dev?token=x", "https://user:password@qa.workers.dev", "https://qa.workers.dev:444"]) {
  test(`rejects unsafe origin ${origin ?? "missing"}`, () => assert.ok(run({ origin }).length));
}
test("does not accept another HTTPS deployment just because it is public", () => assert.ok(run({ origin: "https://other.workers.dev" }).length));
test("rejects absent, expired or incomplete isolation evidence", () => {
  for (const patch of [{ isolated: false }, { expiresAt: "2026-10-18T11:59:59Z" }, { backendCommit: "main" }, { approvalReference: "" }, { databaseEvidence: "" }, { storageEvidence: "" }]) {
    assert.ok(run({ approval: { ...approval, ...patch } }).length);
  }
  assert.ok(run({ approval: undefined }).length);
});
test("rejects production profiles and conflicting hardcoded origins", () => {
  assert.ok(run({ profile: "production" }).length);
  assert.ok(run({ profiles: { preview: { environment: "production" } } }).length);
  assert.ok(run({ profiles: { preview: { ...profiles.preview, env: { ...profiles.preview.env, EXPO_PUBLIC_CITYWALK_API_ORIGIN: "https://getcitywalk.com" } } } }).length);
});
