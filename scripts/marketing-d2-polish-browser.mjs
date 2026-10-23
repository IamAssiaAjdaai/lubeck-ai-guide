import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const origin=process.env.MARKETING_BROWSER_ORIGIN??'http://127.0.0.1:3238';
const root=process.env.MARKETING_POLISH_EVIDENCE??'/private/tmp/mkt-d2-polish09';
const phase=process.env.MARKETING_POLISH_PHASE??'after';
assert(['before','after'].includes(phase));await mkdir(`${root}/${phase}`,{recursive:true});
const browser=await chromium.launch({channel:process.env.MARKETING_BROWSER_CHANNEL==='bundled'?undefined:'chrome',headless:true});
const checks=[],metrics=[],errors=[],external=[];
const check=(value,label)=>{assert(value,label);checks.push(label);};
async function context(options={}){const c=await browser.newContext(options);await c.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==origin){external.push(u.origin);return r.abort();}if(u.pathname==='/api/auth/get-session')return r.fulfill({json:null});return r.continue();});return c;}
try{
 for(const width of [1440,1024,768,390,375]){
  const c=await context({viewport:{width,height:1000},reducedMotion:'reduce'});const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{const mark=()=>document.documentElement?.setAttribute('data-d2-capture','true');if(document.documentElement)mark();else{const observer=new MutationObserver(()=>{if(document.documentElement){mark();observer.disconnect();}});observer.observe(document,{childList:true,subtree:true});}});
  await p.goto(origin);await p.evaluate(()=>document.fonts.ready);await p.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(async i=>{i.loading='eager';await i.decode();})));
  const selectors=['.d2-feature>p','.d2-steps p','.d2-faq summary','.d2-footer p'];
  const sizes=await p.evaluate(ss=>Object.fromEntries(ss.map(s=>[s,[...document.querySelectorAll(s)].map(e=>parseFloat(getComputedStyle(e).fontSize))])),selectors);
  const hero=await p.locator('.d2-hero h1').boundingBox();const portrait=await p.locator('.d2-portrait').boundingBox();
  metrics.push({width,sizes,hero,portrait});
  check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`no horizontal overflow ${width}`);
  for(const section of ['hero','features','faq','footer']){
   const el=p.locator(`[data-section="${section}"]`);await el.scrollIntoViewIfNeeded();await el.screenshot({path:`${root}/${phase}/${section}-${width}.png`,animations:'disabled'});
  }
  if(phase==='after'){
   await p.locator('.d2-skip').focus();check(await p.locator('.d2-skip').evaluate(e=>e.getBoundingClientRect().y>=0&&getComputedStyle(e).clipPath==='none'),`keyboard skip link visible ${width}`);await p.locator('.d2-skip').blur();
   check(sizes['.d2-feature>p'].every(n=>n>=(width<=768?16:17)),`readable feature text ${width}`);
   check(sizes['.d2-footer p'].every(n=>n>=14),`readable footer ${width}`);
   check((await p.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length))===0,`reduced motion has no running animations ${width}`);
   await p.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const axe=await p.evaluate(()=>window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
   await writeFile(`${root}/${phase}/axe-${width}.json`,JSON.stringify({violations:axe.violations,incomplete:axe.incomplete.map(x=>x.id)},null,2));check(!axe.violations.length,`axe landing/footer ${width}`);
   await p.locator('#faq summary').first().focus();await p.keyboard.press('Enter');check(await p.locator('#faq details').first().evaluate(e=>e.open),`keyboard FAQ ${width}`);
   await p.getByRole('navigation',{name:'Produkt im Footer'}).getByRole('button',{name:'Demo ansehen'}).click();check(await p.getByRole('dialog').isVisible(),`footer demo opens actual curated demo ${width}`);await p.keyboard.press('Escape');
   await p.getByRole('link',{name:'Pilotstatus',exact:true}).click();check(await p.getByText('Pilot und öffentliche Registrierung bleiben geschlossen.',{exact:true}).isVisible(),`real pilot status destination ${width}`);
   check(await p.locator('.d2-footer a[href="/rechtliches#bedingungen"]').count()===1,`gated legal destination ${width}`);
   if(width===1440){await p.goto(origin+'/rechtliches#bedingungen');await p.getByRole('heading',{name:'Rechtliche Angaben in Prüfung.'}).waitFor();check(await p.locator('#bedingungen').isVisible(),'legal status route and conditions anchor');await p.goto(origin+'/workspace');await p.getByRole('heading',{name:'Willkommen zurück',exact:true}).waitFor();check(new URL(p.url()).pathname==='/auth'&&await p.getByRole('button',{name:'Neues Konto erstellen',exact:true}).count()===0,'protected route returns to closed signin');await p.goto(origin+'/design/landing-d2');check(await p.getByRole('heading',{name:'Seite nicht verfügbar',exact:true}).isVisible(),'obsolete design route remains inactive');}
  }
  await c.close();
 }
 if(phase==='after'){
  const before=JSON.parse(await readFile(`${root}/before/metrics.json`,'utf8'));
  for(const current of metrics){const b=before.find(x=>x.width===current.width);check(Math.abs(current.hero.width-b.hero.width)<1&&Math.abs(current.hero.height-b.hero.height)<1,`hero heading geometry preserved ${current.width}`);check(Math.abs(current.portrait.width-b.portrait.width)<1&&Math.abs(current.portrait.height-b.portrait.height)<1,`portrait geometry preserved ${current.width}`);}
  const c=await context({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});const p=await c.newPage();await p.goto(origin);await p.evaluate(()=>document.fonts.ready);
  check(await p.getByRole('button',{name:'Bewegung pausieren'}).count()===1,'motion pause control available');
  await p.locator('.d2-features').scrollIntoViewIfNeeded();await p.waitForTimeout(150);check(await p.evaluate(()=>document.getAnimations().some(a=>a.playState==='running')),'normal preference uses actual native motion');
  await p.getByRole('button',{name:'Bewegung pausieren'}).click();check(await p.evaluate(()=>document.getAnimations().every(a=>a.playState!=='running')),'motion pause cancels native and continuous animation');
  await p.getByRole('button',{name:'Bewegung aktivieren'}).click();await p.emulateMedia({reducedMotion:'reduce'});await p.waitForFunction(()=>document.getAnimations().every(a=>a.playState!=='running'));check(await p.evaluate(()=>document.getAnimations().every(a=>a.playState!=='running')),'live reduced-motion change cancels animation');
  await c.close();
 }
 if(errors.length)console.error(errors);check(!errors.length,'zero page errors');check(!external.length,'zero external requests');await writeFile(`${root}/${phase}/metrics.json`,JSON.stringify(metrics,null,2));await writeFile(`${root}/${phase}/RESULTS.json`,JSON.stringify({status:'PASS',checks,errors,external},null,2));console.log(`D2_POLISH_${phase.toUpperCase()}_PASS ${checks.length}`);
}finally{await browser.close();}
