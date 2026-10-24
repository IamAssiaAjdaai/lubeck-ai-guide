// Actual authenticated local API/DB journey; synthetic PDF only. No provider requests.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tsImport } from 'tsx/esm/api';
const {syntheticPdf,businessPages}=await tsImport('../apps/marketing-saas-api/src/intake/pdf.fixtures.ts',import.meta.url);
const origin=process.env.MARKETING_BROWSER_ORIGIN??'http://127.0.0.1:3458';
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)||!process.env.MARKETING_QA_STORAGE_STATE)throw Error('LOCAL_AUTHENTICATED_QA_REQUIRED');
const out=process.env.MARKETING_BUE_EVIDENCE_ROOT??'/private/tmp/mkt-bue-evidence/bue';await mkdir(out,{recursive:true});
const require=createRequire(import.meta.url),browser=await chromium.launch({channel:process.env.MARKETING_BROWSER_CHANNEL==='bundled'?undefined:'chrome',headless:true});
const context=await browser.newContext({storageState:process.env.MARKETING_QA_STORAGE_STATE});
const external=[],checks=[],errors=[];const assert=(v,m)=>{if(!v)throw Error(m);checks.push(m);};
await context.route('**/*',r=>{if(new URL(r.request().url()).origin===origin)return r.continue();external.push(new URL(r.request().url()).origin);return r.abort();});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
try {
  const response=await context.request.post(origin+'/api/projects',{headers:{origin},data:{name:'Fiktiver PDF-Büroservice · BUE QA'}});
  assert(response.ok(),'authenticated owner creates synthetic PDF project');const project=await response.json();
  await page.goto(origin+'/workspace?view=projects');await page.getByLabel('Aktuelles Unternehmen',{exact:true}).selectOption(project.id);
  const panel=page.getByRole('region',{name:'PDF als Wissensquelle'});await panel.waitFor();
  await page.getByLabel('Geschäftsdokument (PDF)',{exact:true}).setInputFiles({name:'Fiktive Leistungen.pdf',mimeType:'application/pdf',buffer:syntheticPdf(businessPages)});
  await panel.getByRole('button',{name:'PDF prüfen',exact:true}).focus();await page.keyboard.press('Enter');
  await panel.getByRole('heading',{name:'Extrahierte Vorschläge · ungeprüft'}).waitFor();
  const candidates=panel.locator('.pilot-fact');assert(await candidates.count()>=3,'actual PDF extraction provides reviewable source-backed statements');
  assert(await panel.getByText(/Seite 2 · Extrahierter Vorschlag/).count()>0,'actual page two source shown');
  assert(await panel.getByRole('button',{name:'Auswahl ungeprüft speichern'}).isDisabled(),'selection requires explicit acknowledgement');
  for(const width of [1440,1024,768,390,375]) {
    await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.fonts.ready);await page.emulateMedia({reducedMotion:'reduce'});
    await panel.getByRole('heading',{name:'Extrahierte Vorschläge · ungeprüft'}).scrollIntoViewIfNeeded();
    await page.screenshot({path:`${out}/candidate-preview-${width}.png`,fullPage:true});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`no horizontal overflow ${width}`);
    const save=panel.getByRole('button',{name:'Auswahl ungeprüft speichern'});await save.scrollIntoViewIfNeeded();
    const box=await save.boundingBox(),nav=await page.locator('.mobile-nav').isVisible()?await page.locator('.mobile-nav').boundingBox():null;
    assert(!nav||box.y+box.height<=nav.y,`save action clears bottom navigation ${width}`);
    await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const axe=await page.evaluate(()=>window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}));
    assert(axe.violations.length===0,`automated axe ${width}`);await writeFile(`${out}/axe-${width}.json`,JSON.stringify({violations:axe.violations,incomplete:axe.incomplete.map(x=>({id:x.id,nodes:x.nodes.length}))},null,2));
  }
  await candidates.first().getByRole('checkbox').focus();await page.keyboard.press('Space');
  await panel.getByLabel(/Ich habe die ausgewählten Aussagen/).check();
  await panel.getByRole('button',{name:'Auswahl ungeprüft speichern'}).click();await panel.getByRole('status').filter({hasText:'Auswahl gespeichert'}).waitFor();
  const before=await (await context.request.get(origin+`/api/projects/${project.id}`)).json();assert(before.context.facts.length===1&&!before.context.facts[0].confirmation,'only selected candidate persisted without approval');
  const fact=page.locator('.company-profile .pilot-fact').first();assert((await fact.textContent()).includes('Quellen-Vorschlag · ungeprüft'),'persisted fact remains explicitly unconfirmed');
  await fact.getByRole('checkbox').check();await page.getByLabel('Ich habe die ausgewählten Aussagen und ihre Quellen geprüft.',{exact:true}).check();
  await page.getByRole('button',{name:'Ausgewählte Fakten bestätigen',exact:true}).click();
  await page.getByText('Von dir bestätigt',{exact:true}).waitFor();
  const after=await (await context.request.get(origin+`/api/projects/${project.id}`)).json();assert(!!after.context.facts[0].confirmation&&after.revision===2,'existing confirmation workflow creates next immutable revision');
  for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.screenshot({path:`${out}/confirmed-fact-${width}.png`,fullPage:true});}
  await page.getByLabel('Geschäftsdokument (PDF)',{exact:true}).setInputFiles({name:'Fiktiver Scan.pdf',mimeType:'application/pdf',buffer:syntheticPdf([[]],false,false,true)});
  await panel.getByRole('button',{name:'PDF prüfen',exact:true}).click();await panel.getByRole('alert').waitFor();if((await panel.getByRole('alert').textContent()).includes('ausgelastet')){assert(true,'rapid repeated upload is rate limited');await page.waitForTimeout(6000);await panel.getByRole('button',{name:'PDF prüfen',exact:true}).click();}await panel.getByRole('alert').filter({hasText:'Keine geeigneten Textaussagen'}).waitFor();assert(true,'blank/image-only document explains no OCR instead of inventing facts');
  await page.screenshot({path:`${out}/empty-document-390.png`,fullPage:true});
  assert(!external.length,'no external browser requests');assert(!errors.length,'no browser JavaScript errors');
  await writeFile(out+'/RESULTS.json',JSON.stringify({status:'PASS',checks,external,errors,method:'Actual loopback API and PostgreSQL; synthetic PDF; headless Chrome, not physical device/screen reader'},null,2));console.log('BUE_BROWSER_PASS',checks.length);
}finally{await browser.close();}
