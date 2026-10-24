import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),origin=process.env.MARKETING_BROWSER_ORIGIN??'http://127.0.0.1:3238',root=process.env.MARKETING_DEMO_POLISH_EVIDENCE??'/private/tmp/mkt-demo-polish10',phase=process.env.MARKETING_DEMO_POLISH_PHASE??'after';
assert(['before','after'].includes(phase));await mkdir(`${root}/${phase}`,{recursive:true});const checks=[],errors=[],external=[],metrics=[];
const check=(v,label)=>{assert(v,label);checks.push(label);};const browser=await chromium.launch({channel:process.env.MARKETING_BROWSER_CHANNEL==='bundled'?undefined:'chrome',headless:true});
try{
 for(const width of [1440,1024,768,390,375]){
  const height=width>900?1000:width>600?1024:844;
  const c=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});await c.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==origin){external.push(u.origin);return r.abort();}if(u.pathname==='/api/auth/get-session')return r.fulfill({json:null});return r.continue();});const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(origin);await p.evaluate(()=>document.fonts.ready);const opener=p.locator('.d2-hero-copy').getByRole('button',{name:'Demo ansehen',exact:true});await opener.scrollIntoViewIfNeeded();const y=await p.evaluate(()=>scrollY);await opener.click();const modal=p.getByRole('dialog');await modal.waitFor();
  for(const summary of await modal.locator('.demo01-secondary summary').all()){await summary.scrollIntoViewIfNeeded();await summary.press('Enter');check(await summary.locator('..').evaluate(e=>e.open),`keyboard disclosure ${width}`);}
  await modal.locator('.demo01-secondary').screenshot({path:`${root}/${phase}/expanded-${width}.png`,animations:'disabled'});
  await modal.locator('.demo01-secondary summary').first().scrollIntoViewIfNeeded();await p.screenshot({path:`${root}/${phase}/modal-expanded-${width}.png`,animations:'disabled'});
  const sizes=await modal.evaluate(el=>Object.fromEntries(['.demo01 details>p','.demo01 details li','.demo01-source','.demo01-reset small','.demo01 summary'].map(s=>[s,[...el.querySelectorAll(s)].map(e=>parseFloat(getComputedStyle(e).fontSize))])));metrics.push({width,sizes});
  if(phase==='after'){
   check(Object.values(sizes).flat().every(v=>v>=14),`all sampled supporting text at least 14px ${width}`);
   check(sizes['.demo01 details>p'].every(v=>v>=16),`disclosure content 16px ${width}`);
   check(await modal.evaluate(e=>e.scrollWidth<=e.clientWidth),`no horizontal modal overflow ${width}`);
   const scroll=modal.locator('.d2-demo-scroll'),close=modal.getByRole('button',{name:'Demo schließen'});
   check(await scroll.evaluate(e=>e.scrollHeight>e.clientHeight&&getComputedStyle(e).overflowY==='auto'),`single primary scroll pane ${width}`);
   check(await modal.evaluate(e=>getComputedStyle(e).overflowY==='hidden'),`outer modal is not a second scroll pane ${width}`);
   await scroll.evaluate(e=>{e.scrollTop=e.scrollHeight;});const a=await close.boundingBox(),b=await modal.boundingBox();check(a&&b&&a.y>=b.y&&a.y+a.height<=Math.min(height,b.y+b.height),`close remains visible at bottom ${width}`);
   check(await modal.locator('textarea').evaluate(e=>e.scrollHeight<=e.clientHeight+2),`textarea expands without nested text scrolling ${width}`);
   const locked=await p.evaluate(()=>({y:scrollY,position:getComputedStyle(document.body).position}));await p.mouse.move(2,500);await p.mouse.wheel(0,700);await p.waitForTimeout(50);check(await p.evaluate(before=>scrollY===before.y&&getComputedStyle(document.body).position===before.position,locked),`background wheel cannot scroll page ${width}`);
   check(locked.position==='fixed',`background lock active ${width}`);
   await p.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const axe=await p.evaluate(()=>window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));await writeFile(`${root}/${phase}/axe-${width}.json`,JSON.stringify({violations:axe.violations,incomplete:axe.incomplete.map(x=>x.id)},null,2));check(!axe.violations.length,`axe expanded demo ${width}`);
   check(await p.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length)===0,`reduced motion static ${width}`);
  }
  await modal.locator('.demo01-secondary details').last().scrollIntoViewIfNeeded();await p.screenshot({path:`${root}/${phase}/modal-sources-${width}.png`,animations:'disabled'});
  await p.keyboard.press('Escape');check(!await modal.isVisible(),`Escape closes ${width}`);check(await opener.evaluate(e=>e===document.activeElement),`focus restored to opener ${width}`);
  if(phase==='after'){await p.waitForFunction(expected=>Math.abs(scrollY-expected)<1&&document.body.style.position!=='fixed',y);check(await p.evaluate(expected=>Math.abs(scrollY-expected)<1,y),`page position restored ${width}`);check(await p.evaluate(()=>document.body.style.position!=='fixed'),`background lock released ${width}`);
   const footer=p.getByRole('navigation',{name:'Produkt im Footer'}).getByRole('button',{name:'Demo ansehen'});await footer.scrollIntoViewIfNeeded();const footerY=await p.evaluate(()=>scrollY);await footer.click();await modal.getByRole('button',{name:'Demo schließen'}).click();await p.waitForFunction(expected=>Math.abs(scrollY-expected)<1&&document.body.style.position!=='fixed',footerY);check(await footer.evaluate(e=>e===document.activeElement),`footer opener also regains focus ${width}`);
  }
  await c.close();
 }
 if(phase==='after'){
  const c=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});await c.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==origin)return r.abort();if(u.pathname==='/api/auth/get-session')return r.fulfill({json:null});return r.continue();});const p=await c.newPage();await p.goto(origin);await p.locator('.d2-hero-copy').getByRole('button',{name:'Demo ansehen',exact:true}).click();const summary=p.locator('.demo01-secondary summary').first();await summary.focus();await summary.press('Enter');check(await p.locator('.demo01-secondary details>p').first().evaluate(e=>getComputedStyle(e).animationName==='demo01-disclosure'),'native disclosure has subtle opening fade');await summary.press('Space');check(await summary.locator('..').evaluate(e=>!e.open)&&await summary.evaluate(e=>e===document.activeElement),'keyboard collapse preserves focus');await summary.press('Enter');await p.emulateMedia({reducedMotion:'reduce'});await p.waitForFunction(()=>getComputedStyle(document.querySelector('.demo01-secondary details>p')).animationName==='none');check(true,'live reduced motion disables disclosure animation');await c.close();
 }
 check(!errors.length,'zero page errors');check(!external.length,'zero external requests');await writeFile(`${root}/${phase}/RESULTS.json`,JSON.stringify({status:'PASS',checks,metrics},null,2));console.log(`DEMO_POLISH_${phase.toUpperCase()}_PASS ${checks.length}`);
}finally{await browser.close();}
