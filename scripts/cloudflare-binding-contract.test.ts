// @vitest-environment node
import { describe, expect, it } from "vitest";
import config from "../cloudflare.config";
import baseline from "../docs/deployment/cloudflare-production-binding-baseline.json";
import { checkActiveVersion, checkBindingContract } from "./lib/cloudflare-binding-contract.mjs";

const candidate = () => structuredClone({
  name: baseline.worker,
  compatibilityDate: baseline.compatibilityDate,
  compatibilityFlags: baseline.compatibilityFlags,
  assets: baseline.assets,
  env: { ...baseline.bindings, ...baseline.reviewedAdditions } as Record<string, { type: string; value?: string; id?: string; dev?: { connectionString: string } }>,
});
const active = () => ({
  id: baseline.activeVersion,
  compatibility_date: baseline.compatibilityDate,
  compatibility_flags: baseline.compatibilityFlags,
  assets: { config: { not_found_handling: baseline.assets.notFoundHandling } },
  bindings: Object.entries(baseline.bindings).map(([name, b]) => ({
    name, type: b.type === "secret" ? "secret_text" : b.type === "text" ? "plain_text" : b.type,
    ...("value" in b ? { text: b.value } : {}), ...("id" in b ? { id: b.id } : {}),
  })),
});

describe("production Cloudflare binding preservation", () => {
  it("checks the real proposed configuration against all active bindings", () => {
    expect(checkBindingContract(config.worker, baseline)).toEqual({
      preserved: Object.keys(baseline.bindings), added: Object.keys(baseline.reviewedAdditions),
    });
  });
  it.each(Object.keys(baseline.bindings))("blocks removal of active binding %s", name => {
    const c = candidate(); delete c.env[name];
    expect(() => checkBindingContract(c, baseline)).toThrow(`Missing binding: ${name}`);
  });
  it("rejects making DATABASE_URL a public text binding without leaking its value", () => {
    const c = candidate(); c.env.DATABASE_URL = { type: "text", value: "synthetic-private-value" };
    try { checkBindingContract(c, baseline); throw new Error("Expected rejection"); }
    catch (e) { expect(String(e)).toContain("Binding type changed: DATABASE_URL"); expect(String(e)).not.toContain("synthetic-private-value"); }
  });
  it("rejects inline secret values and additional asset-routing settings", () => {
    const c = candidate(); c.env.DATABASE_URL = { type: "secret", value: "synthetic-private-value" };
    expect(() => checkBindingContract(c, baseline)).toThrow("Unexpected secret configuration: DATABASE_URL");
    expect(() => checkBindingContract({ ...candidate(), assets: { ...baseline.assets, runWorkerFirst: true } }, baseline)).toThrow("Unreviewed asset setting");
  });
  it.each(["CITYWALK_CONTENT_SOURCE", "CITYWALK_DATABASE_RUNTIME", "CITYWALK_MEDIA_STORAGE"])("rejects text-value drift: %s", name => {
    const c = candidate(); c.env[name].value = "unreviewed";
    expect(() => checkBindingContract(c, baseline)).toThrow(`Text binding changed: ${name}`);
  });
  it("rejects a changed Hyperdrive target and local overrides", () => {
    const c = candidate(); c.env.HYPERDRIVE.id = "different-resource";
    expect(() => checkBindingContract(c, baseline)).toThrow("Resource binding changed: HYPERDRIVE");
    const local = candidate(); local.env.HYPERDRIVE.dev = { connectionString: "synthetic-private-value" };
    expect(() => checkBindingContract(local, baseline)).toThrow("Local database override present");
  });
  it("rejects compatibility, Worker-name, asset-routing and unreviewed addition drift", () => {
    for (const c of [
      { ...candidate(), name: "other-worker" },
      { ...candidate(), compatibilityDate: "2026-10-14" },
      { ...candidate(), compatibilityFlags: [] },
      { ...candidate(), assets: { notFoundHandling: "single-page-application" } },
    ]) expect(() => checkBindingContract(c, baseline)).toThrow();
    const c = candidate(); c.env.UNREVIEWED = { type: "secret" };
    expect(() => checkBindingContract(c, baseline)).toThrow("Unreviewed binding: UNREVIEWED");
  });
  it("accepts matching fresh version metadata but rejects version and binding drift", () => {
    expect(checkActiveVersion(active(), baseline).preserved).toHaveLength(16);
    expect(() => checkActiveVersion({ ...active(), id: "different-version" }, baseline)).toThrow("Active Worker version changed");
    const v = active(); v.bindings.push({ name: "NEW_SECRET", type: "secret_text" });
    expect(() => checkActiveVersion(v, baseline)).toThrow("Unreviewed binding: NEW_SECRET");
    const missing = active(); missing.bindings = missing.bindings.filter(b => b.name !== "DATABASE_URL");
    expect(() => checkActiveVersion(missing, baseline)).toThrow("Missing binding: DATABASE_URL");
  });
});
