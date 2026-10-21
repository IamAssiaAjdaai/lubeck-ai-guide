import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const output = path.resolve(".cloudflare/output");
const worker = path.join(output, "v0/workers/default");
const source = await readFile(path.join(worker, "bundle/index.js"), "utf8");
await stat(path.join(worker, "bundle/ssr/index.js"));
const pages = ["/", "/explore", "/privacy", "/terms", "/imprint", "/support", "/account-deletion", "/landing-preview", "/:locale/:citySlug"];
const handlers = ["/api/auth/:all+", "/api/content/cities", "/api/account/export", "/api/account/delete-request", "/api/account/delete-confirm", "/api/guide", "/api/analytics/marketing-funnel"];
for (const route of pages) assert.ok(source.includes(`page:${route}\``) || source.includes(`page:${route}"`), `Missing bundled page: ${route}`);
for (const route of handlers) assert.ok(source.includes(`route-handler:${route}\``) || source.includes(`route-handler:${route}"`), `Missing bundled API: ${route}`);
const modules = await readdir(path.join(worker, "bundle"), { recursive: true });
const bundledText = (await Promise.all(modules.filter(file => file.endsWith(".js")).map(file => readFile(path.join(worker, "bundle", file), "utf8")))).join("\n");
assert.ok(bundledText.includes("Make every city your own."), "Missing marketing landing content");
const config = JSON.parse(await readFile(path.join(worker, "worker.config.json"), "utf8"));
assert.equal(config.assets.notFoundHandling, "none", "Do not replace missing API/page routes with a static SPA fallback");
for (const field of ["NAME", "STREET_ADDRESS", "POSTAL_CITY"]) {
  assert.equal(config.env[`CITYWALK_LEGAL_OPERATOR_${field}`]?.type, "secret", "Operator identity must remain a runtime binding");
}
const revision = process.env.GITHUB_SHA || process.env.CITYWALK_BUILD_REVISION || execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
assert.match(revision, /^[a-f0-9]{40}$/, "A full Git revision is required for release provenance");
const evidence = {
  revision, builtAt: new Date().toISOString(), node: process.version,
  worker: config.name, bundleSha256: createHash("sha256").update(source).digest("hex"),
  pages, handlers, ssrModule: true,
  limitation: "Bundle inclusion only. Runtime, operator identity, provider configuration and production acceptance remain separate gates.",
};
await writeFile(path.join(output, "citywalk-build-evidence.json"), JSON.stringify(evidence, null, 2) + "\n");
console.log(`Cloudflare bundle verified: ${pages.length} pages, ${handlers.length} API handlers; revision ${revision}.`);
