import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:net";
import { readFile, writeFile, realpath, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { validatePreviewArtifact } from "./contract.mjs";
import { PREVIEW_TEXT_BINDINGS, PREVIEW_SECRET_BINDINGS } from "../../src/cloudflare/previewBindings.mjs";

const root = fileURLToPath(new URL("../..", import.meta.url));
assert.equal(process.argv.length, 3, "Usage: node tools/cloudflare-preview/smoke.mjs <candidate-directory>");
const directory = await realpath(process.argv[2]);
assert.ok(directory.startsWith(path.join(root, ".citywalk/cloudflare-api-preview/candidate-")));
const bundleRoot = path.join(directory, "workspace/.cloudflare/output/v0/workers/default/bundle");
const report = JSON.parse(await readFile(path.join(directory, "report.json"), "utf8"));
const manifestBytes = await readFile(path.join(directory, "artifact-manifest.json"));
assert.equal(createHash("sha256").update(manifestBytes).digest("hex"), report.artifactManifestSha256);
const artifactRoot = path.resolve(bundleRoot, "../../..");
for (const [name, expected] of Object.entries(JSON.parse(manifestBytes.toString()))) {
  const file = path.resolve(artifactRoot, name);
  assert.ok(file.startsWith(artifactRoot + path.sep));
  assert.equal(createHash("sha256").update(await readFile(file)).digest("hex"), expected, "Artifact changed after dry run");
}
const config = JSON.parse(await readFile(path.join(bundleRoot, "../worker.config.json"), "utf8"));
validatePreviewArtifact(config, config.env.HYPERDRIVE.id);
assert.equal(createHash("sha256").update(await readFile(path.join(bundleRoot, "index.js"))).digest("hex"), report.workerBundleSha256);
let connections = 0, outbound = 0;
// A TCP tripwire, not a PostgreSQL instance: any attempted database connection
// would fail this test. No existing database or container is touched.
const tripwire = createServer(socket => { connections++; socket.destroy(); });
await new Promise(resolve => tripwire.listen(0, "127.0.0.1", resolve));
const address = tripwire.address();
const env = {
  ...PREVIEW_TEXT_BINDINGS,
  ...Object.fromEntries(PREVIEW_SECRET_BINDINGS.map(key => [key, "synthetic-not-a-live-secret-at-least-32-characters"])),
  BETTER_AUTH_URL: "https://citywalk-api-preview.synthetic.workers.dev",
  CITYWALK_PREVIEW_DATABASE_NAME: "citywalk_preview_synthetic",
  CITYWALK_PREVIEW_DATABASE_USER: "citywalk_preview_reader",
  CITYWALK_MEDIA_S3_ENDPOINT: "https://preview-storage.example.test",
  CITYWALK_MEDIA_S3_BUCKET: "citywalk-preview-synthetic",
  HYPERDRIVE: { connectionString: `postgresql://citywalk_preview_reader:synthetic@127.0.0.1:${address.port}/citywalk_preview_synthetic` },
};
let runtime;
const results = [];
try {
  runtime = new Miniflare(convertV4MiniflareOptions({ workers: [{
    name: "citywalk-api-preview",
    modulesRoot: bundleRoot,
    modules: await Promise.all((await readdir(bundleRoot, { recursive: true }))
      .filter(name => name.endsWith(".js"))
      .sort((a, b) => a === "index.js" ? -1 : b === "index.js" ? 1 : a.localeCompare(b))
      .map(async name => ({ type: "ESModule", path: path.join(bundleRoot, name), contents: await readFile(path.join(bundleRoot, name), "utf8") }))),
    compatibilityDate: config.compatibilityDate, compatibilityFlags: config.compatibilityFlags,
    bindings: env,
    outboundService: () => { outbound++; return new Response(null, { status: 503 }); },
  }] }));
  for (const [method, route] of [
    ["GET", "/api/health"], ["GET", "/api/content/cities"], ["GET", "/api/auth/get-session"],
    ["POST", "/api/auth/sign-up/email"], ["POST", "/api/guide"], ["POST", "/api/commerce/checkout"],
    ["POST", "/api/commerce/native/notifications/apple"], ["POST", "/api/commerce/native/notifications/google"],
    ["POST", "/api/commerce/webhooks/revenuecat"], ["POST", "/api/account/delete-request"],
  ]) {
    const response = await runtime.dispatchFetch(env.BETTER_AUTH_URL + route, { method });
    assert.equal(response.status, 503);
    assert.equal(await response.text(), "Preview unavailable.");
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.ok(response.headers.get("x-robots-tag").includes("noindex"));
    results.push({ method, route, status: response.status });
  }
  assert.equal(connections, 0, "The locked artifact must not attempt a database socket");
  assert.equal(outbound, 0, "The locked artifact must not call an external service");
  await writeFile(path.join(directory, "runtime-smoke.json"), JSON.stringify({
    workerBundleSha256: report.workerBundleSha256, results, databaseConnections: connections, outboundRequests: outbound,
    limitation: "Locked compiled artifact only; no live Hyperdrive or backend acceptance.",
  }, null, 2) + "\n");
  console.log(`Compiled Worker PASS: ${results.length} locked routes; zero database connections and external requests.`);
} finally {
  await runtime?.dispose();
  await new Promise(resolve => tripwire.close(resolve));
}
