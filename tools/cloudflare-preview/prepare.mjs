import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, symlink, writeFile, lstat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { FIXTURE_HYPERDRIVE, requirePreviewHyperdrive, validatePreviewArtifact, rejectProductionIdentifiers } from "./contract.mjs";

const root = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const args = process.argv.slice(2);
assert.ok(args.length === 0 || args.length === 1 && args[0] === "--fixture", "Usage: node tools/cloudflare-preview/prepare.mjs [--fixture]");
const fixture = args[0] === "--fixture";
const id = requirePreviewHyperdrive(fixture ? FIXTURE_HYPERDRIVE : process.env.CITYWALK_PREVIEW_HYPERDRIVE_ID, fixture);
const revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const originalProductionConfig = await readFile(path.join(root, "cloudflare.config.ts"));
const parent = path.join(root, ".citywalk/cloudflare-api-preview");
await mkdir(parent, { recursive: true });
const directory = await mkdtemp(path.join(parent, "candidate-"));
const workspace = path.join(directory, "workspace");
await mkdir(workspace);
const sourceManifest = {};
const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
// Include only this feature's new files before its first commit. No other
// untracked source, audit, environment or credential file is copied.
for (const name of await readdir(path.join(root, "tools/cloudflare-preview"))) tracked.push(`tools/cloudflare-preview/${name}`);
tracked.push("src/cloudflare/previewBindings.mjs", "src/cloudflare/previewPolicy.ts", "src/cloudflare/previewEntrypoint.ts", "src/cloudflare/previewPolicy.test.ts");
for (const name of new Set(tracked)) {
  if (name === "cloudflare.config.ts" || name.split("/").some(part => part.startsWith(".env") || part.startsWith(".dev.vars"))) continue;
  const source = path.join(root, name), target = path.join(workspace, name);
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target);
  sourceManifest[name] = hash(await readFile(target));
}
await writeFile(path.join(workspace, "cloudflare.config.ts"), 'export { default } from "./tools/cloudflare-preview/cloudflare.config.ts";\n');
await symlink(path.join(root, "node_modules"), path.join(workspace, "node_modules"), "dir");
await mkdir(path.join(directory, "home"));
// Existing font cache is optional. Its absence fails offline, never fetches.
const fontCache = path.join(root, ".vinext/fonts");
try {
  await cp(fontCache, path.join(workspace, ".vinext/fonts"), { recursive: true });
  for (const name of await readdir(path.join(workspace, ".vinext/fonts"), { recursive: true })) {
    if (!name.endsWith(".css")) continue;
    const file = path.join(workspace, ".vinext/fonts", name);
    await writeFile(file, (await readFile(file, "utf8")).split(fontCache).join(path.join(workspace, ".vinext/fonts")));
  }
} catch (error) { if (error.code !== "ENOENT") throw error; }
const env = {
  PATH: path.dirname(process.execPath) + path.delimiter + "/usr/bin:/bin",
  HOME: path.join(directory, "home"), CI: "1", NODE_ENV: "production",
  CF_TELEMETRY_DISABLED: "1", CLOUDFLARE_TELEMETRY_DISABLED: "1", WRANGLER_SEND_METRICS: "false",
  CLOUDFLARE_VITE_FORCE_LOCAL: "true", CITYWALK_PREVIEW_HYPERDRIVE_ID: id,
  CITYWALK_PREVIEW_FIXTURE: fixture ? "1" : "0",
  NODE_OPTIONS: `--import=${pathToFileURL(path.join(root, "tools/cloudflare-preview/network-guard.mjs")).href}`,
};
function run(name, command) {
  const output = execFileSync(process.execPath, command, { cwd: workspace, env, encoding: "utf8", timeout: 180_000, maxBuffer: 16 * 1024 * 1024 });
  return writeFile(path.join(directory, `${name}.log`), output);
}
await run("build", [path.join(root, "node_modules/vite/bin/vite.js"), "build", "--config", "tools/cloudflare-preview/vite.config.mts"]);
const output = path.join(workspace, ".cloudflare/output/v0");
assert.deepEqual(await readdir(path.join(output, "workers")), ["default"], "Exactly one Preview Worker is required");
const worker = path.join(output, "workers/default");
const config = JSON.parse(await readFile(path.join(worker, "worker.config.json"), "utf8"));
const rootConfig = JSON.parse(await readFile(path.join(output, "config.json"), "utf8"));
const result = validatePreviewArtifact(config, id, rootConfig);
const bundle = await readFile(path.join(worker, "bundle/index.js"));
assert.ok(bundle.toString().includes("Preview unavailable."), "Missing runtime isolation guard");
await readFile(path.join(worker, "bundle/ssr/index.js"));
await run("cf-prebuilt-dry-run", [path.join(root, "node_modules/cf/bin/cf"), "deploy", "--prebuilt", "--dry-run", "--worker", "citywalk-api-preview"]);
// Recheck the exact artifact and production bytes after the CLI has read it.
validatePreviewArtifact(JSON.parse(await readFile(path.join(worker, "worker.config.json"), "utf8")), id, rootConfig);
assert.deepEqual(await readFile(path.join(root, "cloudflare.config.ts")), originalProductionConfig);
const artifactManifest = {};
for (const name of (await readdir(output, { recursive: true })).sort()) {
  const file = path.join(output, name), info = await lstat(file);
  assert.ok(!info.isSymbolicLink(), "Artifact may not reference files outside its output");
  if (info.isFile()) {
    const bytes = await readFile(file);
    rejectProductionIdentifiers(bytes);
    artifactManifest[name] = hash(bytes);
  }
}
const manifestBytes = JSON.stringify(artifactManifest, null, 2) + "\n";
await writeFile(path.join(directory, "artifact-manifest.json"), manifestBytes);
await writeFile(path.join(directory, "source-manifest.json"), JSON.stringify(sourceManifest, null, 2) + "\n");
await writeFile(path.join(directory, "report.json"), JSON.stringify({
  revision, ...result, productionConfigSha256: hash(originalProductionConfig),
  workerBundleSha256: hash(bundle), workerConfigSha256: hash(await readFile(path.join(worker, "worker.config.json"))),
  artifactManifestSha256: hash(manifestBytes),
  dryRun: "PASS: cf deploy --prebuilt --dry-run --worker citywalk-api-preview", deployed: false,
  limitation: "Locked offline artifact only. Hyperdrive origin, secrets, storage isolation and remote runtime acceptance are not verified.",
}, null, 2) + "\n");
console.log(`Preview build and exact-artifact dry run PASS. LOCKED; not deployment-ready. Evidence: ${path.relative(root, directory)}`);
