// No build, DB, resource, provider or deployment operations. Writes only .local/.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { loadAndParseConfig } from '@cloudflare/config';
import { root, provenance, profile, validate } from './preflight.mjs';
import { previewConfig } from './config.mjs';

provenance();
validate(previewConfig(profile), profile);
const local = path.join(root, 'tools/preview-395/.local');
const stage = path.join(local, 'project');
assert.ok(existsSync(stage), 'Run prepare.mjs once before isolated verification');
const loaded = await loadAndParseConfig(path.join(stage, 'cloudflare.config.ts'), { mode: 'preview395', isPreview: true });
assert.ok(loaded.result.success, loaded.result.success ? '' : loaded.result.error.message);
assert.deepEqual(loaded.result.data.worker, previewConfig(profile).worker);
for (const file of ['config.mjs', 'config.d.mts', 'guard.mjs', 'guard.d.mts', 'entrypoint.ts', 'profile.json', 'policy.mjs', 'routes.mjs']) {
  assert.deepEqual(readFileSync(path.join(stage, 'tools/preview-395', file)), readFileSync(path.join(root, 'tools/preview-395', file)), `Stale preview copy: ${file}`);
}
const baseline = JSON.parse(readFileSync(new URL('./source-hashes.json', import.meta.url)));
for (const [file, hash] of Object.entries(baseline)) {
  if (file === 'cloudflare.config.ts') continue;
  assert.equal(createHash('sha256').update(readFileSync(path.join(stage, file))).digest('hex'), hash, `Stage source changed: ${file}`);
}
assert.ok(!readdirSync(stage).some(file => file.startsWith('.env')));
assert.ok(!existsSync(path.join(stage, '.citywalk')));
for (const file of ['.github', '.cloudflare/output', 'dist']) assert.ok(!existsSync(path.join(stage, file)));
assert.deepEqual(readdirSync(path.join(stage, 'automation/n8n')), ['citywalk-approved-content-publisher.mock.json']);
const env = {
  PATH: process.env.PATH, HOME: path.join(local, 'home'), TMPDIR: path.join(local, 'tmp'),
  NEXT_TELEMETRY_DISABLED: '1', CI: 'true',
  NODE_OPTIONS: `--import=${path.join(root, 'tools/preview-395/deny-network.mjs')}`,
};
mkdirSync(env.HOME, { recursive: true });
mkdirSync(env.TMPDIR, { recursive: true });
const run = (name, command) => {
  try {
    const result = execFileSync(process.execPath, command, { cwd: stage, env, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    writeFileSync(path.join(local, `${name}.log`), result);
    console.log(`PASS: isolated ${name}`);
  } catch (error) {
    writeFileSync(path.join(local, `${name}.log`), `${error.stdout ?? ''}\n${error.stderr ?? ''}`);
    throw new Error(`Isolated ${name} failed; see tools/preview-395/.local/${name}.log`);
  }
};
console.log('PASS: actual staged parser, exact binding contract, 30 copied hashes and fresh preview module copies');
run('network-denial', ['--input-type=module', '-e', `for (const attempt of [() => fetch('https://provider.invalid'), () => import('node:net').then(m => m.connect(443, 'provider.invalid')), () => import('node:https').then(m => m.get('https://provider.invalid'))]) { try { await attempt(); throw new Error('network not blocked'); } catch (error) { if (error.message !== 'PREVIEW_OFFLINE_VERIFICATION_NETWORK_DISABLED') throw error; } } console.log('fetch, sockets and HTTPS denied before connection');`]);
run('next-typegen', [path.join(root, 'node_modules/next/dist/bin/next'), 'typegen']);
run('next-typescript', [path.join(root, 'node_modules/typescript/bin/tsc'), '--noEmit', '--incremental', 'false', '--pretty', 'false']);
console.log('No full application build or runtime acceptance claimed. Deployment lock unchanged.');
