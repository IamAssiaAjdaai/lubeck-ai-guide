import assert from "node:assert/strict";
import { PREVIEW_SECRET_BINDINGS, PREVIEW_TEXT_BINDINGS } from "../../src/cloudflare/previewBindings.mjs";

export const FIXTURE_HYPERDRIVE = "00000000000000000000000000000000";
// Public resource identifier from the reviewed production config, not a secret.
const productionHyperdrive = "390958927c2946be8571ec5282b35ce6";

export function rejectProductionIdentifiers(bytes) {
  for (const identifier of [productionHyperdrive, "citywalk-production"]) {
    assert.ok(!bytes.includes(identifier), "Production resource identifier found in Preview output");
  }
}

export function requirePreviewHyperdrive(id, fixture = process.env.CITYWALK_PREVIEW_FIXTURE === "1") {
  assert.ok(typeof id === "string" && /^[a-f0-9]{32}$/.test(id), "An independently verified Preview Hyperdrive ID is required");
  assert.notEqual(id, productionHyperdrive, "Production Hyperdrive is forbidden");
  assert.ok(id !== FIXTURE_HYPERDRIVE || fixture, "Unprovisioned fixture requires explicit fixture mode");
  return id;
}

export function validatePreviewArtifact(config, expectedHyperdrive, rootConfig = {}) {
  requirePreviewHyperdrive(expectedHyperdrive, true);
  const allowedKeys = ["name", "compatibilityDate", "compatibilityFlags", "assets", "domains", "triggers", "workersDev", "previewUrls", "env", "manifest"];
  assert.ok(Object.keys(config).every(key => allowedKeys.includes(key)), "Unexpected generated Worker configuration");
  assert.deepEqual(config.manifest, { type: "partial", mainModule: "index.js", modules: {} }, "Unexpected Worker entrypoint or module overrides");
  assert.equal(config.name, "citywalk-api-preview", "Only the isolated Preview Worker is permitted");
  assert.equal(config.workersDev, false);
  assert.equal(config.previewUrls, false);
  assert.deepEqual(config.domains ?? [], [], "Custom domains are forbidden");
  assert.deepEqual(config.triggers ?? [], [], "Routes, schedules, queues and email triggers are forbidden");
  for (const key of ["routes", "crons", "containers", "tailConsumers", "migrations", "exports"]) {
    assert.ok(config[key] === undefined, `Unexpected Worker capability: ${key}`);
  }
  assert.deepEqual(Object.keys(rootConfig).filter(key => key !== "buildContext"), [], "Unexpected root configuration");
  assert.equal(config.assets?.notFoundHandling, "none");
  assert.equal(config.assets?.runWorkerFirst, true, "Every request must pass through the Preview guard");
  assert.deepEqual(config.compatibilityFlags, ["nodejs_compat"]);
  assert.equal(config.compatibilityDate, "2026-10-03");
  const expected = {
    ASSETS: { type: "assets" }, HYPERDRIVE: { type: "hyperdrive", id: expectedHyperdrive },
    ...Object.fromEntries(Object.entries(PREVIEW_TEXT_BINDINGS).map(([key, value]) => [key, { type: "text", value }])),
    ...Object.fromEntries(PREVIEW_SECRET_BINDINGS.map(key => [key, { type: "secret" }])),
  };
  assert.deepEqual(config.env, expected, "Preview bindings must match exactly: no production fallbacks or provider credentials");
  assert.equal(config.env.CITYWALK_PREVIEW_DEPLOYMENT_LOCK.value, "1", "Initial Preview artifacts must stay locked");
  assert.ok(!JSON.stringify(config).includes(productionHyperdrive));
  assert.ok(!JSON.stringify(config).includes("getcitywalk.com"));
  return { worker: config.name, locked: true, secrets: [...PREVIEW_SECRET_BINDINGS], fixture: expectedHyperdrive === FIXTURE_HYPERDRIVE };
}
