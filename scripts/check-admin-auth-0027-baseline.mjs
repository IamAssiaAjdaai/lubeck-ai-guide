#!/usr/bin/env node
/**
 * Read-only preflight for the isolated CITYWALK admin-auth database migration.
 * Run before changing authSchema or generating 0027.
 * It deliberately never connects to a database or rewrites Drizzle metadata.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");
const journal = JSON.parse(read("drizzle/meta/_journal.json"));
const entries = journal.entries;
assert.ok(Array.isArray(entries) && entries.length > 0, "Missing Drizzle journal entries");
entries.forEach((entry, idx) => {
  assert.equal(entry.idx, idx, `Nonsequential Drizzle journal entry at ${idx}`);
  assert.equal(entry.tag.slice(0, 4), String(idx).padStart(4, "0"), `Wrong migration prefix at ${idx}`);
});
const current = entries.at(-1);
assert.equal(current.tag, "0026_shared_walk_links",
  `Migration head changed to ${current.tag}: re-audit develop before generating admin auth`);
assert.ok(existsSync(join(root, "drizzle/meta/0026_snapshot.json")),
  "Missing baseline snapshot 0026");
assert.ok(existsSync(join(root, "drizzle/0026_shared_walk_links.sql")),
  "Missing baseline migration 0026");
const schema = read("src/db/authSchema.ts");
assert.match(schema, /export const user = pgTable\("user"/);
assert.match(schema, /export const staffMemberships = pgTable\(/);
assert.match(schema, /export const externalAccountErasureJobs = pgTable\(/);
assert.doesNotMatch(schema, /twoFactorEnabled:|export const passkey =|export const twoFactor =/,
  "Admin auth schema has already changed: perform migration consistency review, not baseline preflight");
const config = read("drizzle.config.ts");
assert.match(config, /src\/db\/authSchema\.ts/,
  "Auth schema is missing from Drizzle generation config");
console.log("Admin auth baseline PASS: 0026 journal/snapshot/SQL present; existing auth and staff tables preserved.");
console.log("Next: generate additive migration and matching 0027 snapshot/journal with installed Drizzle Kit.");
