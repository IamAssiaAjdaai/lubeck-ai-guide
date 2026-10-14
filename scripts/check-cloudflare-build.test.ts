// @vitest-environment node
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const directories: string[] = [];
const script = path.resolve("scripts/check-cloudflare-build.mjs");
function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "citywalk-bundle-gate-"));
  directories.push(root);
  const worker = path.join(root, ".cloudflare/output/v0/workers/default");
  mkdirSync(path.join(worker, "bundle/ssr"), { recursive: true });
  const pages = ["/", "/explore", "/privacy", "/terms", "/imprint", "/support", "/account-deletion", "/landing-preview", "/:locale/:citySlug"];
  const handlers = ["/api/auth/:all+", "/api/content/cities", "/api/account/export", "/api/account/delete-request", "/api/account/delete-confirm", "/api/guide", "/api/analytics/marketing-funnel"];
  const source = pages.map(route => `"page:${route}"`).concat(handlers.map(route => `"route-handler:${route}"`)).join("\n");
  writeFileSync(path.join(worker, "bundle/index.js"), source);
  writeFileSync(path.join(worker, "bundle/ssr/index.js"), '"A better way to"; "walk a city";');
  writeFileSync(path.join(worker, "worker.config.json"), JSON.stringify({ name: "synthetic-worker", assets: { notFoundHandling: "none" }, env: Object.fromEntries(["NAME", "STREET_ADDRESS", "POSTAL_CITY"].map(field => [`CITYWALK_LEGAL_OPERATOR_${field}`, { type: "secret" }])) }));
  const run = () => execFileSync(process.execPath, [script], { cwd: root, env: { ...process.env, CITYWALK_BUILD_REVISION: "a".repeat(40), GITHUB_SHA: "" }, stdio: "pipe", encoding: "utf8" });
  return { root, worker, source, run };
}
afterEach(() => { for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true }); });
describe("Cloudflare release bundle gate", () => {
  it("accepts complete routes and SSR in a provenance-bearing bundle", () => {
    expect(fixture().run()).toContain("9 pages, 7 API handlers");
  });
  it("rejects a missing auth API rather than accepting page-only builds", () => {
    const f = fixture();
    writeFileSync(path.join(f.worker, "bundle/index.js"), f.source.replace('"route-handler:/api/auth/:all+"', ""));
    expect(f.run).toThrow();
  });
  it("rejects missing SSR modules", () => {
    const f = fixture();
    rmSync(path.join(f.worker, "bundle/ssr/index.js"));
    expect(f.run).toThrow();
  });
  it("rejects absent runtime legal bindings", () => {
    const f = fixture();
    writeFileSync(path.join(f.worker, "worker.config.json"), JSON.stringify({ assets: { notFoundHandling: "none" }, env: {} }));
    expect(f.run).toThrow();
  });
});
