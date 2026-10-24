// Synthetic API interception exercises the actual UI; real auth/tenant evidence is separate.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const origin = process.env.MARKETING_BROWSER_ORIGIN ?? 'http://127.0.0.1:3228';
const phase = process.env.DASHBOARD_PHASE ?? 'after';
const root = process.env.MARKETING_STUDIO_EVIDENCE_ROOT ?? `docs/qa/marketing-saas/dashboard-02/${phase}/fixtures`;
await mkdir(root, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const checks = [], external = [], errors = [], axe = [];
let apiFailure=false, empty=false, stale=false, multi=false;
const assert = (ok, label) => { if (!ok) throw Error(label); checks.push(label); };
const company = { id: 'project-a', name: 'Glanz Büroservice · Beispiel', revision: 2 };
const companyB={id:'project-b',name:'Atelier Nord · Beispiel',revision:0};
const facts = ['Büroreinigung für Unternehmen in Düsseldorf.', 'Eine Anfrage beginnt mit einem persönlichen Erstgespräch.', 'Bitte halten Sie die Bürofläche zur Besprechung bereit.'];
const detail = { ...company, context: { identity: { name: company.name, summary: 'Fiktiver Büroservice', website: '' }, facts: facts.map((statement, i) => ({ id: 'f'+i, statement, confirmation: { actorId: 'synthetic' } })), markets: [] }, evidence: [], history: [1,2] };
const packs = [{ id: 'pack-a', status: 'completed', created_at: '2026-10-23T12:00:00Z', goal: 'sichtbarkeit', output_revision: 2, context_revision: 2 }];
const pack = { ...packs[0], versions: [{ version: 2, created_at: '2026-10-24T09:00:00Z', content: { campaign: { goal: 'sichtbarkeit' }, days: ['Angaben prüfen','Ersten Beitrag überarbeiten','Erstgespräch erklären','Eigene Bilder prüfen','Dritten Beitrag lesen','Alle Texte freigeben','Inhalte manuell herunterladen'].map((task,i)=>({day:i+1,time:'Dein Zeitpunkt',task})), posts: [{channel:'linkedin',text:'Büroreinigung in Düsseldorf.\nGlanz Büroservice bietet Büroreinigung für Unternehmen in Düsseldorf.'},{channel:'linkedin',text:'Ein persönliches Erstgespräch.\nSo beginnt eine Anfrage bei unserem fiktiven Büroservice.'},{channel:'linkedin',text:'Gut vorbereitet ins Gespräch.\nHalte deine Bürofläche für die Besprechung bereit.'}] } }] };
await context.route('**/*', route => {
 const url = new URL(route.request().url());
 if (url.origin !== origin) { external.push(url.origin); return route.abort(); }
 if (!url.pathname.startsWith('/api/')) return route.continue();
 if(url.pathname.includes('/projects/project-b')) {
  const body=url.pathname.endsWith('/packs')?[]:url.pathname.endsWith('/draft')?null:url.pathname.endsWith('/readiness')?{ready:false,reason:'missing_themes',revision:0,questions:['Welche Leistung bietest du an?']}:{...companyB,context:null,evidence:[],history:[]};
  return route.fulfill({json:body});
 }
 if(apiFailure && url.pathname.endsWith('/packs'))return route.fulfill({status:503,json:{code:'TEST_FAILURE'}});
 let body;
 if (url.pathname === '/api/health') body = { demo: true, localRegistration: false };
 else if (url.pathname === '/api/auth/get-session') body = { user: { name: 'Lokales Testkonto' } };
 else if (url.pathname === '/api/projects') body = empty?[]:multi?[company,companyB]:[company];
 else if (url.pathname.endsWith('/workspace/draft')) body = { goal:'mehr_anfragen',channel:'linkedin',savedAt:'2026-10-22T10:00:00Z',themesReviewed:false };
 else if (url.pathname.endsWith('/workspace/readiness')) body = {ready:true,reason:'ready',revision:2,themes:[],questions:[]};
 else if (url.pathname.includes('/workspace/reviews/')) body = [0,1,2].map(postIndex=>({postIndex,version:stale?1:2,approved:postIndex===0,textApproved:postIndex===0,image:null}));
 else if (url.pathname.endsWith('/packs/pack-a')) body=pack;
 else if (url.pathname.endsWith('/packs')) body=packs;
 else if (url.pathname.endsWith('/project-a')) body=detail;
 else return route.fulfill({status:404,json:{code:'NOT_FOUND'}});
 return route.fulfill({json:body});
});
page.on('pageerror', e=>errors.push(e.message));
try {
 await page.goto(origin+'/workspace');
 await page.getByRole('heading',{name:/^(Deine Inhalte\. Bereit für deine Handschrift\.|Dein Marketing beginnt mit deinem Unternehmen\.)$/}).waitFor();
 await page.getByText('Prüfung offen · 2 von 3 Beiträgen',{exact:true}).first().waitFor();
 for(const width of [1440,1024,768,390,375]) {
  await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:`${root}/overview-${width}.png`,fullPage:true});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`no overflow ${width}`);
  assert(await page.locator('#overview-title').evaluate(e=>getComputedStyle(e).fontFamily.includes('Fraunces')&&parseFloat(getComputedStyle(e).fontSize)>=36),`editorial reference heading ${width}`);
  assert(await page.locator('.reference-post-card').count()===3,`three real text previews ${width}`);
  assert(await page.getByText('Symbolbild · synthetisch · kein Kundenfoto',{exact:true}).isVisible(),`honest decorative image ${width}`);
  if(width===1440){
   const sidebar=await page.locator('.sidebar').boundingBox();assert(sidebar.width===240,'reference sidebar width 240px');
   const cards=await page.locator('.reference-post-card').all();const boxes=await Promise.all(cards.map(e=>e.boundingBox()));assert(boxes.every(b=>b.y===boxes[0].y),'reference three-column post arrangement');
   const strategy=await page.locator('.reference-strategy').boundingBox(),plan=await page.locator('.reference-week').boundingBox();assert(plan.x>strategy.x&&plan.y===strategy.y,'reference two-column direction and weekly tasks');
  }
  const primary=page.getByRole('button',{name:'Inhalte prüfen',exact:true});await primary.scrollIntoViewIfNeeded();
  const primaryBox=await primary.boundingBox(),bottom=await page.locator('.mobile-nav').isVisible()?await page.locator('.mobile-nav').boundingBox():null;
  assert(!bottom||primaryBox.y+primaryBox.height<=bottom.y,`next action reachable above bottom navigation ${width}`);
  await page.evaluate(()=>scrollTo(0,0));
  if(phase==='after'){
   const account=page.locator('.account-menu > summary');await account.click();const logout=page.getByRole('button',{name:'Abmelden',exact:true});assert(await logout.evaluate(e=>parseFloat(getComputedStyle(e).fontSize))>=14,`account action readable ${width}`);const logoutBox=await logout.boundingBox();assert(logoutBox.height>=44,`account action touch target ${width}`);await account.focus();await page.keyboard.press('Enter');
   await page.screenshot({path:`${root}/viewport-${width}.png`});
   assert(await page.locator('.campaign-card').count()===1,`older draft remains visible ${width}`);
   assert(await page.getByRole('button',{name:'Inhalte prüfen',exact:true}).isVisible(),`one contextual primary action ${width}`);
   assert(await page.getByText('Prüfung offen · 2 von 3 Beiträgen',{exact:true}).isVisible(),`exact-version review status ${width}`);
   const tiny=await page.locator('.simple-workspace').evaluate(root=>[...root.querySelectorAll('*')].filter(e=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&e.getBoundingClientRect().width>5&&e.getBoundingClientRect().height>5&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&parseFloat(getComputedStyle(e).fontSize)<13).map(e=>({tag:e.tagName,class:e.className,text:e.textContent.slice(0,60),size:getComputedStyle(e).fontSize})));
   assert(tiny.length===0,`no tiny visible workspace text ${width}: ${JSON.stringify(tiny)}`);
   assert(await page.locator('.workspace-intro').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))>=16,`body readable ${width}`);
   if(width<=768){
    for(const button of await page.locator('.mobile-nav button').all()){
     const box=await button.boundingBox();assert(box.width>=44&&box.height>=44,`navigation touch target ${width}`);
     assert(await button.locator('span').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))>=13,`navigation type ${width}`);
    }
   } else assert(await page.locator('.side-nav button').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize))>=14,`sidebar type ${width}`);
   await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
   const scan=await page.evaluate(()=>window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}));
   axe.push({width,violations:scan.violations,incomplete:scan.incomplete.map(x=>({id:x.id,nodes:x.nodes.length}))});
   await writeFile(root+`/axe-${width}.json`,JSON.stringify(axe.at(-1),null,2));
   assert(scan.violations.length===0,`automated axe ${width}`);
  }
 }
 if(phase==='after'){
  await page.setViewportSize({width:1440,height:1000});
  assert((await page.getByRole('region',{name:'Ausblick auf dein Marketing-Team'}).textContent()).includes('Strategie, Kalender, Reels und Stories sind geplant'),'strategy and calendar explicitly marked planned');
  assert(await page.getByRole('navigation',{name:'Arbeitsbereich',exact:true}).getByRole('button',{name:/Strategie|Kalender|Reel|Video/}).count()===0,'planned areas have no dead active navigation');
  await page.getByRole('button',{name:'Inhalte prüfen',exact:true}).focus();await page.keyboard.press('Tab');
  const planSummary=page.locator('.reference-all-days > summary');assert(await planSummary.evaluate(e=>e===document.activeElement),'next action precedes plan disclosure in keyboard order');await page.keyboard.press('Enter');assert(await page.locator('.reference-all-days').getAttribute('open')!==null,'keyboard reveals all seven tasks');await page.keyboard.press('Enter');await page.keyboard.press('Tab');
  assert(await page.getByRole('button',{name:'Alle Packs',exact:true}).evaluate(e=>e===document.activeElement),'predictable keyboard order');
  assert(await page.getByRole('button',{name:'Alle Packs',exact:true}).evaluate(e=>getComputedStyle(e).outlineStyle!=='none'),'visible keyboard focus');
  await page.getByRole('navigation',{name:'Arbeitsbereich',exact:true}).getByRole('button',{name:'Content Packs',exact:true}).focus();await page.keyboard.press('Enter');
  await page.getByRole('heading',{name:'Deine Content Packs',exact:true}).waitFor();assert(await page.locator('.campaign-card').count()===2,'keyboard opens complete saved list');
  stale=true;await page.reload();await page.getByText('Prüfung offen · 3 von 3 Beiträgen',{exact:true}).waitFor();assert(true,'old-version review cannot approve current pack');stale=false;
  apiFailure=true;await page.reload();await page.getByRole('alert').waitFor();assert(await page.locator('.overview-kpis').count()===0,'API error never masquerades as zero KPIs');
  apiFailure=false;await page.getByRole('button',{name:'Erneut laden',exact:true}).click();await page.getByText('Prüfung offen · 2 von 3 Beiträgen',{exact:true}).waitFor();assert(true,'error recovery retains real status');
  multi=true;await page.goto(origin+'/workspace');await page.getByRole('button',{name:'Inhalte prüfen',exact:true}).waitFor();
  await page.getByLabel('Aktuelles Unternehmen',{exact:true}).selectOption('project-b');await page.getByRole('button',{name:'Unternehmensangaben ergänzen',exact:true}).waitFor();
  assert(await page.locator('.overview-brand > strong').textContent()===companyB.name,'selected project owns contextual action and profile');
  assert(await page.locator('.campaign-card').count()===0,'selected company overview never presents another company pack as its own');
  multi=false;empty=true;await page.goto(origin+'/workspace');await page.getByRole('button',{name:'Unternehmen anlegen',exact:true}).waitFor();assert(await page.getByText('Hier wird dein erster Pack sichtbar.',{exact:true}).isVisible(),'honest empty state');
  await page.getByRole('button',{name:'Unternehmen anlegen',exact:true}).focus();await page.keyboard.press('Enter');await page.getByLabel('Unternehmensname',{exact:true}).waitFor();assert(true,'keyboard create-company action opens real onboarding');
 }
 assert(await page.getByRole('button',{name:/Strategie|Kalender|Reel|Video/}).count()===0,'planned areas expose no fake working navigation');
 await page.emulateMedia({reducedMotion:'reduce'});assert(await page.getByRole('button',{name:'Unternehmen anlegen',exact:true}).evaluate(e=>getComputedStyle(e).animationName==='none'&&getComputedStyle(e).transitionDuration==='0s'),'reduced motion respected');
 assert(external.length===0,'no external browser requests'); assert(errors.length===0,'no JavaScript errors');
 await writeFile(root+'/RESULTS.json',JSON.stringify({phase,checks,external,errors,axe,fixture:'synthetic intercepted API; no real session'},null,2));
 console.log('DASHBOARD_BROWSER_PASS '+checks.length);
} finally {await browser.close();}
