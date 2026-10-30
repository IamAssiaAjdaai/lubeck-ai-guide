import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, lstatSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { startServer, files } from './serve.mjs';
const base = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(base, '../..');
const local = path.join(base, '.local');
mkdirSync(path.join(local, 'tmp'), { recursive: true });
mkdirSync(path.join(local, 'home'), { recursive: true });
process.env.TMPDIR = path.join(local, 'tmp');
const provenance = JSON.parse(readFileSync(path.join(base, 'provenance.json')));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: root, maxBuffer: 32 * 1024 * 1024 });
assert.equal(git('rev-parse', 'HEAD').toString().trim(), provenance.candidateCommit);
assert.equal(git('branch', '--show-current').toString().trim(), provenance.branch);
for (const sha of ['53186fdfdfb26b605f6432e5a0484da2ab6def7a','3057e81aad70d612a174dd2b5ae68ea5bf5182ee',provenance.candidateCommit]) git('merge-base','--is-ancestor',sha,'HEAD');
for (const [name, expected] of Object.entries(provenance.sourceHashes)) {
  assert.equal(hash(readFileSync(path.join(root,name))),expected,name);
  assert.equal(hash(git('show',`${provenance.candidateCommit}:${name}`)),expected,name);
}
for (const [name, expected] of Object.entries(provenance.renderInputsUnchangedFromCaptureBase)) assert.equal(hash(git('show',`${provenance.captureBaseCommit}:${name}`)),expected,name);
for (const [name, expected] of Object.entries(provenance.evidenceHashes)) assert.equal(hash(readFileSync(path.join(root,name))),expected,name);
const walk = dir => readdirSync(dir).flatMap(name => {
  const absolute = path.join(dir,name); assert.ok(!lstatSync(absolute).isSymbolicLink(),'No published symlinks');
  return lstatSync(absolute).isDirectory() ? walk(absolute) : [path.relative(path.join(base,'dist'),absolute)];
});
assert.deepEqual(walk(path.join(base,'dist')).sort(), [...files].sort(),'Only eight approved static files');
const forbidden = [/citywalk-production/i, /390958927c2946be8571ec5282b35ce6/i, /getcitywalk\.com/i, /(?:postgres(?:ql)?:\/\/|sk[-_]live[-_]|sk-proj-|gsk_|re_[A-Za-z0-9]{20})/, /(?:DATABASE_URL|HYPERDRIVE|BETTER_AUTH_SECRET|GROQ_API_KEY|RESEND_API_KEY|AWS_SECRET_ACCESS_KEY)/];
for (const name of files) {
  const bytes=readFileSync(path.join(base,'dist',name));
  for(const pattern of forbidden) assert.ok(!pattern.test(bytes.toString('latin1')), `Production/secret marker in ${name}`);
}
for(const shot of provenance.screenshots) {
  const bytes=readFileSync(path.join(base,shot.outputPath));
  assert.equal(hash(bytes),shot.sha256);
  assert.equal(hash(readFileSync(path.join(root,shot.sourcePath))),shot.sha256,'Screenshot must remain byte-identical');
  assert.equal(bytes.readUInt32BE(16),shot.image.width);
  assert.equal(bytes.readUInt32BE(20),shot.image.height);
  assert.deepEqual(shot.pngChunks,['IDAT','IEND','IHDR'],'No textual/personal PNG metadata');
}
const html = readFileSync(path.join(base,'dist/index.html'),'utf8');
const css = readFileSync(path.join(base,'dist/styles.css'),'utf8');
assert.doesNotMatch(html,/<script|<form|<input|<iframe|<object|<embed|\son[a-z]+\s*=|\b(?:https?:)?\/\//i);
assert.doesNotMatch(css,/@import|url\s*\(/i);
assert.match(html, /noindex, nofollow, noarchive, nosnippet/);
assert.match(html, /not access controls/);
assert.match(html, /Visual-only/);
assert.equal(readFileSync(path.join(base,'dist/robots.txt'),'utf8'),'User-agent: *\nDisallow: /\n');
const result={sourceCommit:provenance.candidateCommit,staticFiles:files,protectedSourceHashes:Object.keys(provenance.sourceHashes).length,unchangedHistoricalRenderInputs:Object.keys(provenance.renderInputsUnchangedFromCaptureBase).length,screenshotHashesVerified:4,viewports:[],externalRequests:[],runtimeErrors:[],publication:'NOT DEPLOYED; founder approval and privacy/access review required'};
const server=await startServer(0);
const origin=`http://127.0.0.1:${server.address().port}`;
let browser;
try {
  for(const name of files) {
    const response=await fetch(`${origin}/${name}`);
    assert.equal(response.status,200,name);
    assert.match(response.headers.get('x-robots-tag'),/noindex/);
    assert.equal(hash(new Uint8Array(await response.arrayBuffer())),hash(readFileSync(path.join(base,'dist',name))));
  }
  for(const route of ['/api/auth/get-session','/api/health','/provenance.json','/../README.md','/.env','/cloudflare.config.ts','/screenshots/']) assert.equal((await fetch(origin+route)).status,404,route);
  assert.equal((await fetch(origin+'/',{method:'POST',body:'disabled'})).status,405);
  assert.equal((await fetch(origin+'/',{method:'HEAD'})).status,200);
  const {chromium}=await import(pathToFileURL(process.env.CITYWALK_PLAYWRIGHT_MODULE || '/Users/assia/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href);
  browser=await chromium.launch({executablePath:process.env.CITYWALK_CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,env:{PATH:process.env.PATH,HOME:path.join(local,'home'),TMPDIR:path.join(local,'tmp')}});
  const context=await browser.newContext({serviceWorkers:'block'});
  await context.route('**/*',route=>{
    if(new URL(route.request().url()).origin===origin) return route.continue();
    result.externalRequests.push(route.request().url());return route.abort();
  });
  const page=await context.newPage();
  page.on('pageerror',error=>result.runtimeErrors.push(error.message));
  for(const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:1000});
    await page.goto(origin,{waitUntil:'networkidle'});
    assert.equal(await page.locator('script,form,input,iframe,object,embed').count(),0);
    assert.match(await page.title(),/visual review/);
    const state=await page.evaluate(()=>({
      overflow:document.documentElement.scrollWidth>innerWidth,
      images:[...document.images].map(img=>({loaded:img.complete&&img.naturalWidth>0,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,width:img.getBoundingClientRect().width,height:img.getBoundingClientRect().height})),
      links:[...document.querySelectorAll('a')].map(a=>({href:a.getAttribute('href'),resolved:a.href})),
    }));
    assert.equal(state.overflow,false,`${width}: no horizontal overflow`);
    assert.equal(state.images.length,4);
    for(const img of state.images){assert.ok(img.loaded);assert.ok(Math.abs(img.width/img.height-img.naturalWidth/img.naturalHeight)<0.0001,'Original aspect ratio');}
    for(const link of state.links) assert.equal(new URL(link.resolved).origin,origin,'No external active links');
    await page.keyboard.press('Tab');
    assert.equal(await page.locator(':focus').textContent(),'Skip to screenshots');
    await page.locator(':focus').evaluate(element => element.blur());
    await page.screenshot({path:path.join(local,`gallery-${width}.png`),fullPage:true});
    result.viewports.push({width,imagesLoaded:4,originalAspectRatios:true,horizontalOverflow:false,keyboardSkip:true});
  }
  for(const shot of provenance.screenshots) {
    const url=await page.locator(`#width-${shot.viewport.width} .capture-header a`).getAttribute('href');
    const fullsize=await context.newPage();
    const response=await fullsize.goto(`${origin}/${url}`,{waitUntil:'load'});
    assert.equal(response.status(),200);
    await fullsize.waitForFunction(()=>document.images.length===1&&document.images[0].complete&&document.images[0].naturalWidth>0);
    assert.equal(await fullsize.locator('img').evaluate(img=>img.naturalWidth),shot.image.width);
    await fullsize.close();
  }
  assert.deepEqual(result.externalRequests,[]);
  assert.deepEqual(result.runtimeErrors,[]);
  result.status='PASS';
} finally {
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
  writeFileSync(path.join(local,'test-results.json'),JSON.stringify(result,null,2)+'\n');
}
console.log(JSON.stringify(result,null,2));
