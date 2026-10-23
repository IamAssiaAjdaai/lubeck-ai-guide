import {chromium} from "playwright";
import {mkdir,writeFile} from "node:fs/promises";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url),origin=process.env.MARKETING_ORIGIN??"http://127.0.0.1:3208",out=process.env.MARKETING_BROWSER_EVIDENCE_ROOT??"docs/qa/marketing-saas/consolidate-01/closed";
await mkdir(out,{recursive:true});const browser=await chromium.launch({channel:"chrome",headless:true});const checks=[],external=[];
const check=(v,m)=>{if(!v)throw Error(m);checks.push(m);};
try{
 const context=await browser.newContext();await context.route("**/*",route=>{if(new URL(route.request().url()).origin===origin)return route.continue();external.push(route.request().url());return route.abort();});const page=await context.newPage();
 const health=await (await context.request.get(origin+"/api/health")).json();check(health.localRegistration===false&&health.demo===true,"mock-only local runtime; registration closed");
 const signup=await context.request.post(origin+"/api/auth/sign-up/email",{headers:{origin},data:{name:"Synthetic",email:"closed@example.test",password:"Synthetic-unused-password!"}});check(signup.status()===403,"direct signup denied server-side in final runtime");
 for(const width of [1440,768,390,375]){
 await page.setViewportSize({width,height:1000});await page.goto(origin+"/workspace?view=contents");await page.getByRole("heading",{name:"Willkommen zurück",exact:true}).waitFor();check(new URL(page.url()).pathname==="/auth","protected route denied "+width);check(await page.getByRole("button",{name:"Neues Konto erstellen",exact:true}).count()===0,"no registration control "+width);await page.evaluate(()=>document.fonts.ready);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"auth reflow "+width);await page.screenshot({path:`${out}/auth-${width}.png`,fullPage:true});await page.addScriptTag({path:require.resolve("axe-core/axe.min.js")});const axe=await page.evaluate(()=>window.axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa"]}}));check(!axe.violations.length,"auth automated accessibility "+width);await writeFile(`${out}/axe-${width}.json`,JSON.stringify({violations:axe.violations,incomplete:axe.incomplete.map(x=>({id:x.id,nodes:x.nodes.length}))},null,2));
 }
 for(const route of ["/design/brand/wirkfaden","/design/auth","/design/landing-d","/design/landing-d2","/unknown"]){await page.goto(origin+route);check(await page.getByRole("heading",{name:"Seite nicht verfügbar",exact:true}).isVisible(),"historical route inactive "+route);}
 if(process.env.MARKETING_QA_STORAGE_STATE){const owner=await browser.newContext({storageState:process.env.MARKETING_QA_STORAGE_STATE});const p=await owner.newPage();await p.goto(origin+"/");await p.waitForURL("**/workspace");await p.getByRole("heading",{name:"Was möchtest du heute erstellen?",exact:true}).waitFor();check(true,"existing verified owner session resumes after closed-runtime restart");await owner.close();}
 check(!external.length,"no external browser requests");await writeFile(out+"/RESULTS.json",JSON.stringify({status:"PASS",checks,widths:[1440,768,390,375],external},null,2));console.log("CONSOLIDATE_CLOSED_PASS "+checks.length);
}finally{await browser.close();}
