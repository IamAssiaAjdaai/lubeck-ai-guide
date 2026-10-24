// @vitest-environment node
import { execFileSync, spawnSync } from "node:child_process";
import { loadAndParseConfig } from "@cloudflare/config";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FIXTURE_HYPERDRIVE } from "./contract.mjs";

afterEach(() => vi.unstubAllEnvs());

describe("Preview target selection", () => {
  it("denies TCP, TLS and fetch in the actual child-process preparation guard", () => {
    const source = `
      import assert from 'node:assert/strict';
      import { connect as tcp } from 'node:net';
      import { connect as tls } from 'node:tls';
      assert.throws(() => tcp({host:'127.0.0.1',port:1}), /NETWORK_DENIED/);
      assert.throws(() => tls({host:'127.0.0.1',port:1}), /TLS_DENIED/);
      assert.throws(() => fetch('https://example.test'), /FETCH_DENIED/);
    `;
    expect(() => execFileSync(process.execPath, ["--import", "./tools/cloudflare-preview/network-guard.mjs", "--input-type=module", "--eval", source], {
      env: { PATH: process.env.PATH ?? "", HOME: "/tmp", NODE_ENV: "test" }, stdio: "pipe", timeout: 10_000,
    })).not.toThrow();
  });

  it("parses the separate typed config with the installed Cloudflare parser", async () => {
    vi.stubEnv("CITYWALK_PREVIEW_HYPERDRIVE_ID", FIXTURE_HYPERDRIVE);
    vi.stubEnv("CITYWALK_PREVIEW_FIXTURE", "1");
    const parsed = await loadAndParseConfig("tools/cloudflare-preview/cloudflare.config.ts", { isPreview: false, mode: "production" });
    expect(parsed.result.success).toBe(true);
    if (!parsed.result.success) return;
    const worker = parsed.result.data.worker;
    expect(worker?.name).toBe("citywalk-api-preview");
    expect(worker?.env?.CITYWALK_RUNTIME_ENV).toEqual({ type: "text", value: "preview" });
    expect(worker?.env?.CITYWALK_PREVIEW_DEPLOYMENT_LOCK).toEqual({ type: "text", value: "1" });
    expect(worker?.triggers).toEqual([]);
    expect(worker?.workersDev).toBe(false);
  });

  it.each([undefined, "390958927c2946be8571ec5282b35ce6"])("stops before a build without an acceptable independently supplied Hyperdrive ID", id => {
    const env: NodeJS.ProcessEnv = { PATH: process.env.PATH ?? "", HOME: "/tmp", NODE_ENV: "test" };
    if (id) env.CITYWALK_PREVIEW_HYPERDRIVE_ID = id;
    const result = spawnSync(process.execPath, ["tools/cloudflare-preview/prepare.mjs"], {
      env, encoding: "utf8", timeout: 2_000,
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(id ? "Production Hyperdrive is forbidden" : "An independently verified Preview Hyperdrive ID is required");
  });
});
