import assert from "node:assert/strict";
import { validatePreviewArtifact } from "../cloudflare-preview/contract.mjs";
import { PREVIEW_SECRET_BINDINGS, PREVIEW_TEXT_BINDINGS } from "../../src/cloudflare/previewBindings.mjs";
import { NATIVE_PREVIEW_SECRETS, NATIVE_PREVIEW_TEXT } from "../../src/cloudflare/nativePreviewBindings.mjs";
import { requireRevision } from "./provenance.mjs";

export function validateNativeArtifact(config, id, revision, rootConfig = {}) {
  requireRevision(revision);
  assert.deepEqual(config.env, {
    ASSETS: { type: "assets" }, HYPERDRIVE: { type: "hyperdrive", id },
    ...Object.fromEntries(Object.entries(NATIVE_PREVIEW_TEXT).map(([key, value]) => [key, { type: "text", value }])),
    ...Object.fromEntries(NATIVE_PREVIEW_SECRETS.map(key => [key, { type: "secret" }])),
    CITYWALK_BUILD_REVISION: { type: "text", value: revision },
    CITYWALK_PREVIEW_BOUND_HYPERDRIVE: { type: "text", value: id },
  }, "Native Preview must declare only the exact reviewed isolated bindings");
  // Reuse ALL structural safeguards of #419 without changing its validator.
  return validatePreviewArtifact({ ...config, env: {
    ASSETS: config.env.ASSETS, HYPERDRIVE: config.env.HYPERDRIVE,
    ...Object.fromEntries(Object.entries(PREVIEW_TEXT_BINDINGS).map(([key, value]) => [key, { type: "text", value }])),
    ...Object.fromEntries(PREVIEW_SECRET_BINDINGS.map(key => [key, { type: "secret" }])),
  } }, id, rootConfig);
}

// Pure, offline comparison. Call only with privately verified control-plane
// metadata. Different opaque IDs alone do not establish isolation.
export function verifyResourceIdentity(preview, production) {
  for (const key of ["projectId", "branchId", "endpointId", "originHost", "database", "role", "hyperdriveId", "bucket"]) {
    assert.ok(typeof preview[key] === "string" && preview[key].length && typeof production[key] === "string" && production[key].length, "Complete private identity inventories required");
    assert.notEqual(preview[key], production[key], "Preview and production identities must be disjoint");
  }
  assert.match(preview.branchId, /^br-[a-z0-9-]+$/);
  assert.match(preview.originHost, /^ep-[a-z0-9-]+\.[a-z0-9.-]+\.neon\.tech$/);
  assert.ok(!preview.originHost.includes("-pooler."), "Hyperdrive needs the direct Neon endpoint");
  assert.match(preview.database, /^citywalk_preview_[a-z0-9_]+$/);
  assert.match(preview.role, /^citywalk_preview_[a-z0-9_]+$/);
  assert.match(preview.bucket, /^citywalk-preview-[a-z0-9-]+$/);
  assert.match(preview.hyperdriveId, /^[a-f0-9]{32}$/);
  assert.ok(!["00000000000000000000000000000000", "390958927c2946be8571ec5282b35ce6"].includes(preview.hyperdriveId));
  for (const key of ["syntheticOnly", "originVerified", "leastPrivilege", "tlsVerifyFull", "storageIsolated", "credentialsIndependent"]) {
    assert.equal(preview[key], true, "Private verification incomplete");
  }
  assert.equal(preview.hyperdriveOriginHost, preview.originHost);
  assert.equal(preview.hyperdriveDatabase, preview.database);
  assert.equal(preview.hyperdriveRole, preview.role);
  return true;
}
