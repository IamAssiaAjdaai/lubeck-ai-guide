// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const path=fileURLToPath(new URL('../README.md',import.meta.url));
const text=readFileSync(path,'utf8');
describe('canonical API operator documentation',()=>{
 it('has only resolvable local documentation links',()=>{
  const links=[...text.matchAll(/\]\(([^)]+)\)/g)].map(x=>x[1]);expect(links.length).toBeGreaterThan(3);
  for(const link of links)expect(existsSync(resolve(dirname(path),link)),link).toBe(true);
 });
 it('uses current canonical commands and keeps credentials and signup private',()=>{
  expect(text).toContain('node scripts/marketing-consolidate-ci.mjs');
  expect(text).toContain('MARKETING_LOCAL_REGISTRATION_ENABLED=false');
  expect(text).not.toMatch(/\.env\.example|auth-persistence\.md|marketing-saas-pilot-smoke\.mjs|postgresql:\/\/[^\s]+:[^\s]+@/);
 });
});
