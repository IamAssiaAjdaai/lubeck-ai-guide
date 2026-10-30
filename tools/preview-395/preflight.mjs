import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { previewConfig } from './config.mjs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const head = '7b99bf81c7c19010ef6019ac9a31cf974903e3b6';
export const branch = 'codex/landing-runtime-rc';
export const profile = JSON.parse(readFileSync(new URL('./profile.json', import.meta.url)));
export function validate(config, selected, deployable = false) {
  assert.deepEqual(Object.keys(selected).sort(), ['worker', 'origin', 'hyperdriveId', 'databaseHost', 'databaseName', 'mediaBucket', 'resourceReview', 'accessReview', 'runtimeReview'].sort(), 'Unexpected profile fields rejected');
  const expected = previewConfig(selected);
  assert.deepEqual(config, expected, 'Only the exact sanitized binding/config allowlist is accepted');
  assert.equal(selected.worker, 'citywalk-preview-395-7b99bf8');
  assert.match(selected.origin, /^https:\/\/citywalk-preview-395-7b99bf8\.[a-zA-Z0-9-]+\.workers\.dev$/);
  assert.match(selected.databaseName, /^citywalk_preview_395(?:_[a-z0-9]+)?$/);
  assert.match(selected.databaseHost, /^[a-zA-Z0-9.-]+$/);
  assert.equal(selected.mediaBucket, 'citywalk-preview-395-synthetic');
  const serialized = JSON.stringify({ config, selected }).toLowerCase();
  for (const forbidden of ['citywalk-production', 'getcitywalk.com', '390958927c2946be8571ec5282b35ce6']) {
    assert.ok(!serialized.includes(forbidden), 'Production target/resource rejected');
  }
  if (deployable) {
    assert.match(selected.hyperdriveId, /^[a-f0-9]{32}$/, 'Unprovisioned Hyperdrive');
    assert.ok(!serialized.includes('replace') && !selected.databaseHost.endsWith('.invalid'), 'Unprovisioned hostname');
    for (const key of ['resourceReview', 'accessReview', 'runtimeReview']) assert.equal(selected[key], 'APPROVED', `${key} pending`);
    throw new Error('NO-GO: this preparation tool never authorizes or performs deployment; independently review provisioned bindings, secrets, artifact and acceptance evidence');
  }
  return true;
}
export function provenance() {
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  assert.equal(git('rev-parse', 'HEAD'), head);
  assert.equal(git('branch', '--show-current'), branch);
  for (const sha of ['53186fdfdfb26b605f6432e5a0484da2ab6def7a', '3057e81aad70d612a174dd2b5ae68ea5bf5182ee', head]) git('merge-base', '--is-ancestor', sha, 'HEAD');
  const baseline = JSON.parse(readFileSync(new URL('./source-hashes.json', import.meta.url)));
  for (const [file, hash] of Object.entries(baseline)) {
    assert.equal(createHash('sha256').update(readFileSync(path.join(root, file))).digest('hex'), hash, `Source changed: ${file}`);
    assert.equal(createHash('sha256').update(execFileSync('git', ['show', `${head}:${file}`], { cwd: root, maxBuffer: 32 * 1024 * 1024 })).digest('hex'), hash, `Baseline differs from HEAD: ${file}`);
  }
  for (const name of ['cf', '@vinext/cloudflare', 'vinext']) {
    const version = JSON.parse(readFileSync(path.join(root, 'node_modules', name, 'package.json'))).version;
    assert.equal(version, name === 'cf' ? '1.0.0-beta.12' : '1.0.1');
  }
  return Object.keys(baseline).length;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const count = provenance();
    validate(previewConfig(profile), profile, process.argv.includes('--deployable'));
    console.log(`PASS: draft isolation contract; ${count} protected source/config hashes; branch/HEAD/3 commits; pinned tool versions. NOT deployment authorization.`);
  } catch (error) { console.error(`NO-GO: ${error.message}`); process.exitCode = 1; }
}
