const { chromium } = await import(process.env.MARKETING_PLAYWRIGHT_MODULE ?? 'playwright');
import { readdir, readFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const email=`browser-${randomUUID()}@example.test`;const password='Synthetic-browser-password-2026!';
try {
 await page.goto('http://127.0.0.1:3108/auth');
 await page.getByRole('button',{name:'Neues Konto erstellen'}).click();
 await page.getByLabel('Dein Name').fill('QA Unternehmen');await page.getByLabel('E-Mail-Adresse').fill(email);await page.getByLabel('Passwort',{exact:true}).fill(password);
 await page.getByRole('button',{name:'Konto erstellen',exact:true}).click();
 await page.getByRole('status').filter({hasText:'Bitte bestätige'}).waitFor();
 let mail;
 for(const file of await readdir('.qa-mail')){const data=JSON.parse(await readFile('.qa-mail/'+file,'utf8'));if(data.to===email&&data.kind==='verify')mail=data;}
 if(!mail)throw new Error('QA verification sink missing');
 await page.goto(mail.url);await page.goto('http://127.0.0.1:3108/auth');
 await page.getByLabel('E-Mail-Adresse').fill(email);await page.getByLabel('Passwort',{exact:true}).fill(password);await page.getByRole('button',{name:'Anmelden',exact:true}).click();
 await page.getByRole('heading',{name:'Dein Unternehmen',exact:true}).waitFor();
 await page.getByLabel('Unternehmensname',{exact:true}).fill('Glanz Browser QA');await page.getByRole('button',{name:'Unternehmen anlegen',exact:true}).click();
 await page.getByLabel('Was bietest du an?').fill('Wir reinigen Büros in Düsseldorf.');await page.getByLabel('Fakten zum Prüfen').fill('Wir reinigen Büros in Düsseldorf.');await page.getByRole('button',{name:'Angaben speichern',exact:true}).click();
 await page.getByText('Eigene Angabe · ungeprüft').waitFor();
 await page.getByRole('checkbox',{name:'Wir reinigen Büros in Düsseldorf.',exact:true}).check();await page.getByRole('checkbox',{name:'Ich habe die ausgewählten'}).check();await page.getByRole('button',{name:'Ausgewählte Fakten bestätigen'}).click();
 await page.getByText('Von dir bestätigt',{exact:true}).waitFor();
 await page.reload();await page.getByRole('button',{name:'Glanz Browser QA',exact:true}).click();await page.getByText('Von dir bestätigt',{exact:true}).waitFor();
 await mkdir('docs/qa/marketing-saas/screenshots',{recursive:true});
 for(const width of [1440,390,375]){await page.setViewportSize({width,height:1000});await page.screenshot({path:`docs/qa/marketing-saas/screenshots/auth-facts-${width}.png`,fullPage:true});const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow)throw new Error(`Horizontal overflow ${width}`);}
 if(errors.length)throw new Error(errors.join('\n'));
 console.log('MARKETING_SAAS_AUTH_FACTS_BROWSER_PASS');
} finally{await browser.close();}
