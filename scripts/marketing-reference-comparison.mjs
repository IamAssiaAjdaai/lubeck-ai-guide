// Local browser composition of an owner reference and actual browser evidence. No AI generation.
import { readFile, mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
const reference=process.env.MARKETING_REFERENCE_IMAGE;
const implementation=process.env.MARKETING_IMPLEMENTATION_IMAGE;
const output=process.env.MARKETING_COMPARISON_OUTPUT;
if(!reference||!implementation||!output)throw Error('Supply local reference, implementation and output paths');
const [a,b]=await Promise.all([readFile(reference),readFile(implementation)]);
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1800,height:1400},deviceScaleFactor:1});
 await page.route('**/*',route=>route.abort());
 await page.setContent(`<html lang="de"><head><meta charset="utf-8"><title>Referenzvergleich</title><style>body{margin:0;background:#f0f3ec;color:#162d2c;font:16px/1.5 system-ui}header{padding:20px 28px}h1{font-size:25px;margin:0 0 5px}p{margin:0}.columns{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:0 20px 20px}figure{margin:0;background:white;border:1px solid #dce4d9;border-radius:12px;overflow:hidden}figcaption{padding:14px;font-weight:600}img{width:100%;height:auto;display:block}</style></head><body><header><h1>Owner-Referenz und tatsächlicher Browser-Stand</h1><p>Links: ausgewählte Vision. Rechts: lokale Anwendung mit synthetischen, gespeicherten Testdaten. Keine Pixelgleichheit behauptet.</p></header><main class="columns"><figure><figcaption>Owner-Referenz · erste Bildvorlage</figcaption><img alt="Ausgewählte Wirkfaden-Referenz" src="data:image/png;base64,${a.toString('base64')}"></figure><figure><figcaption>Implementierung · 1440px · echter Browser</figcaption><img alt="Tatsächlicher Marketing-Workspace" src="data:image/png;base64,${b.toString('base64')}"></figure></main></body></html>`);
 await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
 await mkdir(new URL('.', 'file://'+output).pathname,{recursive:true});
 await page.screenshot({path:output,fullPage:true});
} finally {await browser.close();}
