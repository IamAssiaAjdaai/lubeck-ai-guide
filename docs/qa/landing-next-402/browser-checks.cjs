const fs=require('node:fs'), path=require('node:path');
const {chromium}=require(process.env.CITYWALK_PLAYWRIGHT_MODULE || 'playwright');
let activeBrowser;const qa=path.resolve(process.env.CITYWALK_QA_DIR || '.citywalk/landing-next-402'), screenshots=path.join(qa,'screenshots');fs.mkdirSync(screenshots,{recursive:true});
const results={layouts:[],accessibility:[],interactions:[],links:[],consoleErrors:[],externalRequests:[]};
function check(name,ok,detail){results.interactions.push({name,pass:!!ok,detail});}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CITYWALK_CHROMIUM_EXECUTABLE});
 results.browser=browser.version();activeBrowser=browser;const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,reducedMotion:'reduce',colorScheme:'light'});
 await context.route('**/*',route=>{const url=new URL(route.request().url());if(['file:','data:','blob:'].includes(url.protocol)||url.hostname==='127.0.0.1'&&url.port==='3195')return route.continue();results.externalRequests.push(url.origin);return route.abort();});
 const page=await context.newPage();page.on('pageerror',e=>results.consoleErrors.push(e.message));page.on('console',m=>{if(m.type()==='error')results.consoleErrors.push(m.text());});
 let referenceCopy;const reference=process.env.CITYWALK_REFERENCE_HTML;if(!reference)throw new Error('CITYWALK_REFERENCE_HTML is required');if(require('crypto').createHash('sha256').update(fs.readFileSync(reference)).digest('hex')!=='aafef293fee8e81e530970cb0385f37897787edf00502233fd9becefc53d20ce')throw new Error('Reference hash mismatch');
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:1000});await page.goto('file://'+reference);await page.evaluate(()=>{document.querySelectorAll('.rv').forEach(e=>e.classList.add('in-v'));});await page.evaluate(async()=>{const imgs=[...document.images];imgs.forEach(i=>i.loading='eager');await Promise.all(imgs.map(i=>i.decode()));});referenceCopy=await page.locator('main > section').allInnerTexts();await page.screenshot({path:path.join(screenshots,`reference-${width}.png`),fullPage:true,animations:'disabled'});
 }
 await page.goto('http://127.0.0.1:3195/landing-next-preview',{waitUntil:'networkidle'});
 await page.addStyleTag({content:'nextjs-portal { display: none !important; }'});await page.evaluate(async()=>{const imgs=[...document.images];imgs.forEach(i=>i.loading='eager');await Promise.all(imgs.map(i=>i.decode()));});
 const actualCopy=await page.locator('main > section').allInnerTexts();const normalize=t=>t.replace(/Illustrative UI – not a final app screenshot/g,'').replace(/\s+/g,' ').trim();for(let i=0;i<9;i++)check('reference section copy '+(i+1),normalize(referenceCopy[i])===normalize(actualCopy[i]),normalize(referenceCopy[i])===normalize(actualCopy[i])?undefined:{expected:normalize(referenceCopy[i]),actual:normalize(actualCopy[i])});
 check('nine sections',await page.locator('main > section').count()===9);
 check('nine native FAQ disclosures',await page.locator('details').count()===9);
 check('noindex',await page.locator('meta[name=robots]').getAttribute('content').then(x=>x.includes('noindex')));
 check('prelaunch store links disabled',await page.locator('a[href*="apps.apple.com"],a[href*="play.google.com"]').count()===0);
 check('first-party image decoded',await page.locator('main img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0)));
 const links=await page.locator('a[href]').evaluateAll(as=>as.map(a=>({href:a.getAttribute('href'),text:a.textContent.trim()})));
 const fragments=[...new Set(links.filter(a=>a.href.startsWith('#')).map(a=>a.href.slice(1)))];
 for(const id of fragments)check('anchor exists: '+id,await page.locator('[id="'+id+'"]').count()===1);
 for(const width of [320,390,768,1024,1440,1920]){
  await page.setViewportSize({width,height:1000});
  for(const zoom of [100,200]){
   await page.evaluate(z=>{document.documentElement.style.fontSize=z+'%';window.scrollTo(0,0);},zoom);
   // All non-decorative text uses relative sizing; the mock phone is a labeled illustration.
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.evaluate(()=>window.scrollTo(0,0));await page.waitForFunction(()=>window.scrollY===0);const dims=await page.evaluate(()=>({navFits:[...document.querySelectorAll('header a,header button')].filter(e=>e.getBoundingClientRect().width>0).every(e=>{const r=e.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1;}),scrollY,headingTop:document.querySelector('h1').getBoundingClientRect().top,navBottom:document.querySelector('header').getBoundingClientRect().bottom,headingClear:document.querySelector('h1').getBoundingClientRect().top>=document.querySelector('header').getBoundingClientRect().bottom,width:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth,overflow:[...document.querySelectorAll('main section *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left < -1)&&!e.closest('[role=img]');}).slice(0,12).map(e=>({tag:e.tagName,class:e.className,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right}))}));
   results.layouts.push({width,zoom,pass:dims.scroll<=width&&dims.overflow.length===0&&dims.navFits&&dims.headingClear,...dims});
   await page.screenshot({path:path.join(screenshots,`landing-${width}${zoom===200?'-text-200':''}.png`),fullPage:true,animations:'disabled'});
   await page.addScriptTag({path:process.env.CITYWALK_AXE_PATH || require.resolve('axe-core/axe.min.js')});
   const axe=await page.evaluate(async()=>{const r=await axe.run(document);return {violations:r.violations.map(v=>({id:v.id,impact:v.impact,help:v.help,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:r.incomplete.map(v=>({id:v.id,count:v.nodes.length}))};});
   results.accessibility.push({width,zoom,scheme:'light',...axe});
  }
 }
 await page.evaluate(()=>document.documentElement.style.fontSize='100%');
 await page.setViewportSize({width:390,height:1000});
 const burger=page.locator('button[aria-controls=landing-next-menu]');await burger.click();await page.waitForFunction(()=>document.querySelector('button[aria-controls=landing-next-menu]').getAttribute('aria-expanded')==='true');check('menu opens',await burger.getAttribute('aria-expanded')==='true');
 await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('button[aria-controls=landing-next-menu]').getAttribute('aria-expanded')==='false');check('escape closes and restores focus',await burger.getAttribute('aria-expanded')==='false'&&await burger.evaluate(e=>document.activeElement===e));
 await burger.click();await page.waitForFunction(()=>document.querySelector('button[aria-controls=landing-next-menu]').getAttribute('aria-expanded')==='true');await page.getByRole('navigation',{name:'Mobile',exact:true}).getByRole('link',{name:'Cities',exact:true}).click();await page.waitForURL(u=>u.hash==='#cities');await page.waitForFunction(()=>document.querySelector('button[aria-controls=landing-next-menu]').getAttribute('aria-expanded')==='false');check('menu anchor navigates and closes',new URL(page.url()).hash==='#cities'&&await burger.getAttribute('aria-expanded')==='false');
 await page.goto('http://127.0.0.1:3195/landing-next-preview');await page.waitForFunction(()=>typeof document.querySelector('button[aria-controls=landing-next-menu]')?.onclick==='function');await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.keyboard.press('Tab');check('first keyboard target is skip link',await page.evaluate(()=>document.activeElement?.textContent==='Skip to content'));await page.keyboard.press('Enter');check('skip link moves focus to main',await page.evaluate(()=>document.activeElement?.id==='main'));
 const summaries=page.locator('summary');await summaries.nth(0).focus();await page.keyboard.press('Enter');check('FAQ opens with keyboard',await page.locator('details').nth(0).getAttribute('open')!==null);await summaries.nth(1).focus();await page.keyboard.press('Space');check('FAQ exclusive disclosure',await page.locator('details[open]').count()===1&&await page.locator('details').nth(1).getAttribute('open')!==null);await summaries.nth(1).focus();await page.keyboard.press('Space');
 await burger.click();await page.mouse.click(5,600);await page.waitForFunction(()=>document.querySelector('button[aria-controls=landing-next-menu]').getAttribute('aria-expanded')==='false');check('outside click closes menu',await burger.getAttribute('aria-expanded')==='false');
 await burger.click();await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(60);await page.setViewportSize({width:390,height:1000});check('desktop resize clears mobile menu',await burger.getAttribute('aria-expanded')==='false');
 for(const width of [390,1440]){await page.setViewportSize({width,height:1000});await page.emulateMedia({colorScheme:'dark'});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.addScriptTag({path:process.env.CITYWALK_AXE_PATH || require.resolve('axe-core/axe.min.js')});const r=await page.evaluate(async()=>{const r=await axe.run(document);return{violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:r.incomplete.map(v=>({id:v.id,count:v.nodes.length}))};});results.accessibility.push({width,zoom:100,scheme:'dark',...r});await page.screenshot({path:path.join(screenshots,`landing-${width}-dark.png`),fullPage:true,animations:'disabled'});}
 await page.emulateMedia({colorScheme:'light'});
 for(const id of fragments.filter(id=>id!=='main')){
  await page.goto('http://127.0.0.1:3195/landing-next-preview');await page.waitForFunction(()=>typeof document.querySelector('button[aria-controls=landing-next-menu]')?.onclick==='function');
  await page.locator('a[href="#'+id+'"]').filter({visible:true}).last().click();await page.waitForURL(u=>u.hash==='#'+id);
  await page.waitForFunction(id=>document.getElementById(id).getBoundingClientRect().top<=200,id);
  check('section link navigates: '+id, id==='top'?await page.evaluate(()=>scrollY===0):true);
 }
 for(const width of [320,390]){
  await page.setViewportSize({width,height:640});await page.evaluate(()=>{document.documentElement.style.fontSize='200%';scrollTo(0,0);});
  await burger.focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('button[aria-controls=landing-next-menu]').getAttribute('aria-expanded')==='true');
  const last=page.getByRole('navigation',{name:'Mobile',exact:true}).getByRole('link',{name:'Get the app',exact:true});await last.focus();await last.scrollIntoViewIfNeeded();
  check('200% mobile menu remains reachable: '+width,await last.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;}),await last.evaluate(e=>({top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom,viewport:innerHeight})));await page.keyboard.press('Escape');
 }
 await page.evaluate(()=>document.documentElement.style.fontSize='100%');await page.setViewportSize({width:1440,height:1000});
 for(const href of [...new Set(links.filter(a=>a.href.startsWith('/')).map(a=>a.href))]){
  await page.goto('http://127.0.0.1:3195/landing-next-preview');await page.waitForFunction(()=>typeof document.querySelector('button[aria-controls=landing-next-menu]')?.onclick==='function');await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const link=page.locator('a[href="'+href+'"]').filter({visible:true}).first();const response=await Promise.all([page.waitForURL(u=>u.pathname===href),link.click()]);
  await page.waitForFunction(()=>!document.querySelector('h1#h1'));const responseCheck=await context.request.get('http://127.0.0.1:3195'+href);results.links.push({href,actualPath:new URL(page.url()).pathname,status:responseCheck.status(),pass:responseCheck.status()===200,title:await page.title()});
 }
 await browser.close();fs.writeFileSync(path.join(qa,'browser-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({layouts:results.layouts,interactions:results.interactions,accessibility:results.accessibility.map(a=>({...a,violations:a.violations})),links:results.links,consoleErrors:results.consoleErrors,externalRequests:[...new Set(results.externalRequests)]},null,2));
if(results.layouts.some(r=>!r.pass)||results.interactions.some(r=>!r.pass)||results.links.some(r=>!r.pass)||results.accessibility.some(r=>r.violations.length)||results.consoleErrors.length||results.externalRequests.length)process.exitCode=1;
})().catch(async e=>{await activeBrowser?.close();fs.writeFileSync(path.join(qa,'browser-results.json'),JSON.stringify({...results,fatal:e.message},null,2));console.error(e);process.exitCode=1;});
