// @vitest-environment node
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadAndParseConfig } from "@cloudflare/config";
import { FIXTURE_HYPERDRIVE } from "../cloudflare-preview/contract.mjs";
import { validateNativeArtifact, verifyResourceIdentity } from "./contract.mjs";
import { materializeCommit, requireRevision, sha256 } from "./provenance.mjs";

afterEach(() => vi.unstubAllEnvs());
const revision = "a".repeat(40);
const preview = {
  projectId: "preview-project", branchId: "br-synthetic", endpointId: "ep-synthetic", originHost: "ep-synthetic.eu-central-1.aws.neon.tech",
  database: "citywalk_preview_synthetic", role: "citywalk_preview_reader", hyperdriveId: "1".repeat(32), bucket: "citywalk-preview-synthetic",
  hyperdriveOriginHost: "ep-synthetic.eu-central-1.aws.neon.tech", hyperdriveDatabase: "citywalk_preview_synthetic", hyperdriveRole: "citywalk_preview_reader",
  syntheticOnly: true, originVerified: true, leastPrivilege: true, tlsVerifyFull: true, storageIsolated: true, credentialsIndependent: true,
};
const production = Object.fromEntries(["projectId", "branchId", "endpointId", "originHost", "database", "role", "hyperdriveId", "bucket"].map(key => [key, "synthetic-production-deny-pin-" + key]));

describe("private resource approval contract (synthetic fixtures only)", () => {
  it("accepts a complete independent direct-endpoint attestation", () => expect(verifyResourceIdentity(preview, production)).toBe(true));
  it.each(Object.keys(production))("rejects shared %s", key => expect(() => verifyResourceIdentity({ ...preview, [key]: production[key] }, production)).toThrow());
  it.each(["syntheticOnly", "originVerified", "leastPrivilege", "tlsVerifyFull", "storageIsolated", "credentialsIndependent"])("rejects missing approval %s", key => expect(() => verifyResourceIdentity({ ...preview, [key]: false }, production)).toThrow());
  it.each([
    { originHost: "ep-synthetic-pooler.eu-central-1.aws.neon.tech" }, { hyperdriveOriginHost: "ep-other.eu-central-1.aws.neon.tech" },
    { hyperdriveDatabase: "other" }, { hyperdriveRole: "postgres" }, { hyperdriveId: FIXTURE_HYPERDRIVE },
    { hyperdriveId: "390958927c2946be8571ec5282b35ce6" }, { database: "production" }, { role: "postgres" },
  ])("rejects origin/identity mismatch %j", update => expect(() => verifyResourceIdentity({ ...preview, ...update }, production)).toThrow());
  it("requires a complete independently supplied production deny inventory", () => expect(() => verifyResourceIdentity(preview, {})).toThrow());
});

describe("native typed target and immutable source", () => {
  it("uses the real installed cf parser; keeps domain inactive, all triggers off and lock on", async () => {
    vi.stubEnv("CITYWALK_PREVIEW_HYPERDRIVE_ID", FIXTURE_HYPERDRIVE); vi.stubEnv("CITYWALK_PREVIEW_FIXTURE", "1"); vi.stubEnv("CITYWALK_BUILD_REVISION", revision);
    const parsed = await loadAndParseConfig("tools/native-api-preview/cloudflare.config.ts", { isPreview: false, mode: "production" });
    expect(parsed.result.success).toBe(true);
    if (!parsed.result.success) throw new Error("Native config parsing failed");
    const worker = parsed.result.data.worker;
    expect(worker?.env?.CITYWALK_BUILD_REVISION).toEqual({ type: "text", value: revision });
    expect(worker?.env).not.toHaveProperty("CITYWALK_PREVIEW_ACCESS_TOKEN");
    const config = { ...worker, entrypoint: undefined, manifest: { type: "partial", mainModule: "index.js", modules: {} } };
    delete config.entrypoint;
    expect(() => validateNativeArtifact(config, FIXTURE_HYPERDRIVE, revision)).not.toThrow();
    for (const update of [
      { name: "citywalk-production" }, { domains: ["api-preview.getcitywalk.com"] }, { workersDev: true }, { previewUrls: true },
      { triggers: [{ cron: "* * * * *" }] }, { routes: ["getcitywalk.com/*"] },
      { env: { ...config.env, CITYWALK_PREVIEW_DEPLOYMENT_LOCK: { type: "text", value: "0" } } },
      { env: { ...config.env, CITYWALK_BUILD_REVISION: { type: "text", value: "b".repeat(40) } } },
      { env: { ...config.env, HYPERDRIVE: { type: "hyperdrive", id: "390958927c2946be8571ec5282b35ce6" } } },
    ]) expect(() => validateNativeArtifact({ ...config, ...update }, FIXTURE_HYPERDRIVE, revision)).toThrow();
  });
  it.each([undefined, "main", "abcdef0", "a".repeat(39)])("rejects non-exact revisions", value => expect(() => requireRevision(value)).toThrow());
  it("materializes only the exact committed tree; excludes private/untracked bytes and rejects tracked drift", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "citywalk-provenance-"));
    const root = path.join(directory, "repo"); await mkdir(root);
    const git = (args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8", env: { PATH: process.env.PATH, HOME: directory, NODE_ENV: "test", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" } });
    try {
      git(["init", "-q"]); await writeFile(path.join(root, "package-lock.json"), "{}"); await writeFile(path.join(root, "source.txt"), "approved");
      git(["add", "package-lock.json", "source.txt"]);
      git(["-c", "user.name=Synthetic", "-c", "user.email=synthetic@example.test", "-c", "commit.gpgsign=false", "commit", "-qm", "synthetic fixture"]);
      const commit = git(["rev-parse", "HEAD"]).trim();
      await writeFile(path.join(root, "untracked.txt"), "must not enter snapshot"); await writeFile(path.join(root, ".env.local"), "SYNTHETIC=exclude");
      const snapshot = path.join(directory, "snapshot"); const result = await materializeCommit(root, snapshot, commit);
      expect(result.revision).toBe(commit); expect(result.sourceManifest["source.txt"]).toBe(sha256("approved"));
      expect(result.sourceManifest).not.toHaveProperty("untracked.txt"); expect(result.sourceManifest).not.toHaveProperty(".env.local");
      expect(await readFile(path.join(snapshot, "source.txt"), "utf8")).toBe("approved");
      await writeFile(path.join(root, "source.txt"), "uncommitted");
      await expect(materializeCommit(root, path.join(directory, "dirty"), commit)).rejects.toThrow("clean tracked source");
      await expect(materializeCommit(root, path.join(directory, "wrong"), "b".repeat(40))).rejects.toThrow("HEAD changed");
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});
