// Offline preparation only. No build/deploy/secret/resource operations.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, copyFileSync, symlinkSync } from 'node:fs';
import path from 'node:path';
import { root, head, provenance, profile, validate } from './preflight.mjs';
import { previewConfig } from './config.mjs';
provenance();
validate(previewConfig(profile), profile);
const target = path.join(root, 'tools/preview-395/.local/project');
// Refuse reuse: prevents stale output, dotenv and secret inheritance.
mkdirSync(path.dirname(target), { recursive: true });
mkdirSync(target, { recursive: false });
const include = file => file === 'automation/n8n/citywalk-approved-content-publisher.mock.json' || !/^\.(?:env|github)|^(?:mobile|automation)\//.test(file);
const files = execFileSync('git', ['ls-tree', '-r', '--name-only', head], { cwd: root, encoding: 'utf8' }).trim().split('\n');
for (const file of files) {
  if (!include(file)) continue;
  assert.ok(!path.isAbsolute(file) && !file.split('/').includes('..'));
  const destination = path.join(target, file);
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, execFileSync('git', ['show', `${head}:${file}`], { cwd: root, maxBuffer: 32 * 1024 * 1024 }));
}
for (const file of ['config.mjs', 'config.d.mts', 'guard.mjs', 'guard.d.mts', 'entrypoint.ts', 'profile.json', 'policy.mjs', 'routes.mjs']) {
  mkdirSync(path.join(target, 'tools/preview-395'), { recursive: true });
  copyFileSync(path.join(root, 'tools/preview-395', file), path.join(target, 'tools/preview-395', file));
}
writeFileSync(path.join(target, 'cloudflare.config.ts'), `import { defineConfig } from 'cf/config';\nimport { previewConfig } from './tools/preview-395/config.mjs';\nimport profile from './tools/preview-395/profile.json' with { type: 'json' };\nexport default defineConfig(previewConfig(profile));\n`);
// Read-only dependency reuse; no source/config symlinks to the original checkout.
symlinkSync(path.join(root, 'node_modules'), path.join(target, 'node_modules'), 'dir');
writeFileSync(path.join(root, 'tools/preview-395/.local/generated-files.json'), JSON.stringify({ head, files: files.filter(include), additions: ['tools/preview-395/config.mjs', 'tools/preview-395/config.d.mts', 'tools/preview-395/guard.mjs', 'tools/preview-395/guard.d.mts', 'tools/preview-395/entrypoint.ts', 'tools/preview-395/profile.json', 'tools/preview-395/policy.mjs', 'tools/preview-395/routes.mjs', 'node_modules (dependency symlink only)'], replacedCopy: 'cloudflare.config.ts' }, null, 2) + '\n');
console.log('Prepared isolated local root: ' + target + '\nNo build or deployment performed. Resource placeholders remain NO-GO.');
