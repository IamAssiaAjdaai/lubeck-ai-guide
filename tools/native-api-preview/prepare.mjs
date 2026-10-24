import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, writeFile, lstat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { FIXTURE_HYPERDRIVE, requirePreviewHyperdrive, rejectProductionIdentifiers } from "../cloudflare-preview/contract.mjs";
import { validateNativeArtifact } from "./contract.mjs";
import { materializeCommit, requireRevision, sha256 } from "./provenance.mjs";

const root = fileURLToPath(new URL("../..", import.meta.url));
const mode = process.argv[2];
assert.ok(["--fixture", "--reviewed-preview-id-dry-run"].includes(mode) && process.argv.length === 3,
  "Only offline fixture or reviewed-ID dry-run preparation is supported; live deployment is forbidden");
const isFixture = mode === "--fixture";
// This accepts a real Cloudflare *public resource identifier*, never a password or DB URL.
// It does not query Cloudflare, assert real connectivity or authorize deployment.
const requestedId = isFixture ? FIXTURE_HYPERDRIVE : process.env.CITYWALK_PREVIEW_HYPERDRIVE_ID;
const id = requirePreviewHyperdrive(requestedId, isFixture);
assert.ok(isFixture || id !== FIXTURE_HYPERDRIVE, "Reviewed-ID dry run must not use fixture Hyperdrive");
const revision = requireRevision(execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim());
const parent = path.join(root, ".citywalk/native-api-preview");
await mkdir(parent, { recursive: true });
const directory = await mkdtemp(path.join(parent, "candidate-"));
const workspace = path.join(directory, "workspace");
const provenance = await materializeCommit(root, workspace, revision);
const productionHash = sha256(await readFile(path.join(root, "cloudflare.config.ts")));
await writeFile(path.join(workspace, "cloudflare.config.ts"), 'export { default } from "./tools/native-api-preview/cloudflare.config.ts";\n');
await mkdir(path.join(directory, "home"));
const env = {
  PATH: path.dirname(process.execPath) + path.delimiter + "/usr/bin:/bin", HOME: path.join(directory, "home"),
  CI: "1", NODE_ENV: "production", CF_TELEMETRY_DISABLED: "1", CLOUDFLARE_TELEMETRY_DISABLED: "1", WRANGLER_SEND_METRICS: "false",
  CLOUDFLARE_VITE_FORCE_LOCAL: "true", CITYWALK_PREVIEW_HYPERDRIVE_ID: id, ...(isFixture ? { CITYWALK_PREVIEW_FIXTURE: "1" } : {}), CITYWALK_BUILD_REVISION: revision,
  NODE_OPTIONS: `--import=${pathToFileURL(path.join(workspace, "tools/cloudflare-preview/network-guard.mjs")).href}`,
};
async function run(name, executable, args, timeout = 180_000) {
  const output = execFileSync(executable, args, { cwd: workspace, env, encoding: "utf8", timeout, maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
  await writeFile(path.join(directory, `${name}.log`), output);
}
// Fresh dependencies from the COMMITTED lockfile. Workspace links resolve into
// this immutable source snapshot, never into the developer's working tree.
await run("dependencies", process.execPath, [path.join(path.dirname(process.execPath), "../lib/node_modules/npm/bin/npm-cli.js"),
  "ci", "--offline", "--ignore-scripts", "--include=dev", "--no-audit", "--no-fund", "--cache", path.join(homedir(), ".npm")]);
const fontCache = path.join(root, ".vinext/fonts");
await cp(fontCache, path.join(workspace, ".vinext/fonts"), { recursive: true });
const fontManifest = {};
for (const name of (await readdir(path.join(workspace, ".vinext/fonts"), { recursive: true })).sort()) {
  const file = path.join(workspace, ".vinext/fonts", name);
  if (!(await lstat(file)).isFile()) continue;
  if (name.endsWith(".css")) await writeFile(file, (await readFile(file, "utf8")).split(fontCache).join(path.join(workspace, ".vinext/fonts")));
  fontManifest[name] = sha256(await readFile(file));
}
await run("build", process.execPath, [path.join(workspace, "node_modules/vite/bin/vite.js"), "build", "--config", "tools/native-api-preview/vite.config.mts"]);
const output = path.join(workspace, ".cloudflare/output/v0");
assert.deepEqual(await readdir(path.join(output, "workers")), ["default"]);
const configPath = path.join(output, "workers/default/worker.config.json");
const rootConfig = JSON.parse(await readFile(path.join(output, "config.json"), "utf8"));
const validate = async () => validateNativeArtifact(JSON.parse(await readFile(configPath, "utf8")), id, revision, rootConfig);
await validate();
const artifactManifest = async () => {
  const manifest = {};
  for (const name of (await readdir(output, { recursive: true })).sort()) {
    const file = path.join(output, name), info = await lstat(file);
    assert.ok(!info.isSymbolicLink());
    if (!info.isFile()) continue;
    const bytes = await readFile(file); rejectProductionIdentifiers(bytes); manifest[name] = sha256(bytes);
  }
  return manifest;
};
const before = await artifactManifest();
await run("dry-run", process.execPath, [path.join(workspace, "node_modules/cf/bin/cf"), "deploy", "--prebuilt", "--dry-run", "--worker", "citywalk-api-preview"]);
await validate();
assert.deepEqual(await artifactManifest(), before, "Artifact changed during dry run");
assert.equal(sha256(await readFile(path.join(root, "cloudflare.config.ts"))), productionHash);
assert.equal(execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(), revision);
await writeFile(path.join(directory, "manifest.json"), JSON.stringify({ ...provenance, productionConfigSha256: productionHash,
  fontManifest, artifactManifest: before, artifactManifestSha256: sha256(JSON.stringify(before)),
  workerBundleSha256: before["workers/default/bundle/index.js"],
  locked: true, fixture: isFixture, reviewedIdDryRun: !isFixture, dryRun: "PASS", deployed: false,
  limitation: "Offline locked build and dry run only. Reviewed-ID mode checks ID shape/denylist, not remote identity, TLS, origin, secrets, synthetic data, IdP or device acceptance.",
}, null, 2) + "\n");
console.log(`Locked commit-only native Preview ${isFixture ? "fixture" : "reviewed-ID"} dry-run PASS: ${path.relative(root, directory)}`);
