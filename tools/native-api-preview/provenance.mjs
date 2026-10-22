import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
export function requireRevision(value) {
  assert.match(value ?? "", /^[a-f0-9]{40}$/, "Full immutable commit SHA required");
  return value;
}
export async function materializeCommit(root, destination, revision) {
  requireRevision(revision);
  const git = args => execFileSync("git", args, { cwd: root, encoding: "utf8" });
  assert.equal(git(["rev-parse", "HEAD"]).trim(), revision, "HEAD changed");
  assert.equal(git(["status", "--porcelain", "--untracked-files=no"]), "", "Commit-only build requires clean tracked source");
  const tree = git(["rev-parse", `${revision}^{tree}`]).trim();
  const records = git(["ls-tree", "-rz", "--full-tree", revision]).split("\0").filter(Boolean);
  /** @type {Record<string, string>} */
  const manifest = {};
  await mkdir(destination, { recursive: true });
  for (const record of records) {
    const [header, name] = record.split("\t");
    const [mode, kind, object] = header.split(" ");
    assert.ok(kind === "blob" && ["100644", "100755"].includes(mode), "Source symlinks/submodules require explicit review");
    assert.ok(!name.split("/").some(part => (part.startsWith(".env") && part !== ".env.example") || part.startsWith(".dev.vars")), "Tracked environment files require explicit review");
    const bytes = execFileSync("git", ["cat-file", "blob", object], { cwd: root, maxBuffer: 32 * 1024 * 1024 });
    manifest[name] = sha256(bytes);
    // Production config is hashed for preservation but never executed/copied.
    if (name === "cloudflare.config.ts" || name === ".env.example") continue;
    const target = path.join(destination, name);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes, { mode: mode === "100755" ? 0o755 : 0o644 });
  }
  return { revision, tree, sourceManifest: manifest, sourceManifestSha256: sha256(JSON.stringify(manifest)), packageLockSha256: sha256(await readFile(path.join(destination, "package-lock.json"))) };
}
