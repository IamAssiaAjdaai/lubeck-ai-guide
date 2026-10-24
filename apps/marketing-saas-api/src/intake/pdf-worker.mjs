// Text extraction only. Never instantiate a viewer, rendering surface or scripting manager.
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
try {
  const task = getDocument({ data: new Uint8Array(Buffer.concat(chunks)), verbosity: 0,
    isEvalSupported: false, enableXfa: false, useWasm: false, useWorkerFetch: false,
    disableFontFace: true, useSystemFonts: false, stopAtErrors: true,
    disableAutoFetch: true, disableRange: true, disableStream: true });
  const doc = await task.promise;
  if (doc.numPages > 20) throw Error('PDF_PAGE_LIMIT');
  if (await doc.getJSActions() || await doc.getAttachments()) throw Error('PDF_ACTIVE_CONTENT');
  const pages = []; let count = 0;
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    if (await page.getJSActions()) throw Error('PDF_ACTIVE_CONTENT');
    const content = await page.getTextContent();
    let text = '';
    for (const item of content.items) if ('str' in item) {
      count += item.str.length + 1;
      if (count > 50000) throw Error('PDF_TEXT_LIMIT');
      text += item.str + (item.hasEOL ? '\n' : ' ');
    }
    pages.push({ page: i, text }); page.cleanup();
  }
  await task.destroy();
  process.stdout.write(JSON.stringify({ pages }));
} catch (error) {
  const code = error?.name === 'PasswordException' ? 'PDF_ENCRYPTED' :
    ['PDF_PAGE_LIMIT','PDF_TEXT_LIMIT','PDF_ACTIVE_CONTENT'].includes(error?.message) ? error.message : 'PDF_INVALID';
  process.stdout.write(JSON.stringify({ error: code }));
  process.exitCode = 1;
}
