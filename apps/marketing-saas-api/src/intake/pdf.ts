import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { redactObviousCredentials } from '@marketing/core';
import { ApiError } from '../errors';

export const PDF_MAX_BYTES = 2 * 1024 * 1024;
const pagesSchema = z.object({ pages: z.array(z.object({ page: z.number().int().min(1).max(20), text: z.string().max(50000) })).min(1).max(20) });
export type PdfCandidate = { id: string; statement: string; page: number; snippet: string; caution: string; status: 'extracted' };
export type PdfPreview = { token: string; label: string; digest: string; extractedAt: string; expiresAt: string; expectedRevision: number; pages: number; candidates: PdfCandidate[]; omitted: number };
const worker = fileURLToPath(new URL('./pdf-worker.mjs', import.meta.url));
const guard = fileURLToPath(new URL('./pdf-guard.mjs', import.meta.url));
const parserDirectory = fileURLToPath(new URL('../../../../node_modules/pdfjs-dist/', import.meta.url));

export async function parsePdf(bytes: Buffer, mime: string): Promise<{ page: number; text: string }[]> {
  if (bytes.length > PDF_MAX_BYTES) throw new ApiError(413, 'PDF_SIZE_LIMIT');
  if (mime !== 'application/pdf' || !bytes.subarray(0, 8).toString('ascii').match(/^%PDF-1\.[0-7]|^%PDF-2\.0/)) throw new ApiError(400, 'PDF_TYPE');
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--max-old-space-size=96', '--permission',
      `--allow-fs-read=${worker}`, `--allow-fs-read=${guard}`, `--allow-fs-read=${parserDirectory}`,
      '--import', guard, worker], { env: { NODE_ENV: 'production' }, stdio: ['pipe','pipe','ignore'] });
    const output: Buffer[] = []; let size = 0; let settled = false;
    const finish = (error?: ApiError, value?: {page:number;text:string}[]) => {
      if (settled) return; settled = true; clearTimeout(timer);
      if (error) { child.kill('SIGKILL'); reject(error); } else resolve(value!);
    };
    const timer = setTimeout(() => finish(new ApiError(422, 'PDF_TIMEOUT')), 8000);
    child.on('error', () => finish(new ApiError(422, 'PDF_INVALID')));
    child.stdin.on('error', () => { /* exit handler returns a fixed, non-sensitive error */ });
    child.stdout.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > 350000) finish(new ApiError(422, 'PDF_TEXT_LIMIT')); else output.push(chunk);
    });
    child.on('close', () => {
      if (settled) return;
      try {
        const value = JSON.parse(Buffer.concat(output).toString());
        if (value.error) {
          const allowed = ['PDF_ENCRYPTED','PDF_ACTIVE_CONTENT','PDF_PAGE_LIMIT','PDF_TEXT_LIMIT'];
          return finish(new ApiError(422, allowed.includes(value.error) ? value.error : 'PDF_INVALID'));
        }
        finish(undefined, pagesSchema.parse(value).pages);
      } catch { finish(new ApiError(422, 'PDF_INVALID')); }
    });
    child.stdin.end(bytes);
  });
}

export function candidatesFromPages(pages: {page:number;text:string}[], digest: string) {
  const candidates: PdfCandidate[] = []; let omitted = 0; const seen = new Set<string>();
  for (const {page, text} of pages) {
    // Preserve clauses and negation. No summarization, instruction following or inferred claims.
    for (const line of text.split(/[\r\n]+|(?<=[.!?])\s+(?=[A-ZÄÖÜ])/u)) {
      const statement = redactObviousCredentials(line.normalize('NFC').replace(/\s+/g, ' ').trim());
      if (statement.length < 12 || seen.has(statement)) continue;
      if (statement.length > 1000 || candidates.length >= 24 || statement.includes('[REDACTED]') || /ignore|ignorier|system\s*prompt|systemanweisung|previous instructions|api[_ -]?key|passwort|password/i.test(statement)) { omitted++; continue; }
      seen.add(statement);
      const id = 'pdf-' + createHash('sha256').update(`${digest}:${page}:${statement}`).digest('hex').slice(0,32);
      candidates.push({ id, statement, snippet: statement, page, status: 'extracted',
        caution: /€|\bEUR\b|preis|garant|zertifi|heil|medizin|rendite|geplant|roadmap|zukünftig/i.test(statement)
          ? 'Preis, Zusage, Fachangabe oder Planung: Gültigkeit und Bedeutung besonders prüfen.' : 'Dokumentaussage – Richtigkeit, Aktualität und mögliche Widersprüche selbst prüfen.' });
    }
  }
  if (!candidates.length) throw new ApiError(422, 'PDF_NO_CANDIDATES');
  return {candidates, omitted};
}

/** Ephemeral staging, not a second knowledge database. Raw PDFs are never retained. */
export class PdfIntake {
  private previews = new Map<string, {actorId:string; projectId:string; value:PdfPreview}>();
  private active = new Set<string>();
  private lastAttempt = new Map<string, number>();
  constructor(private now = () => Date.now(), private parser = parsePdf) {}
  private prune() {
    for (const [key, item] of this.previews) if (Date.parse(item.value.expiresAt) <= this.now()) this.previews.delete(key);
    for (const [key, time] of this.lastAttempt) if (this.now()-time>60000) this.lastAttempt.delete(key);
  }
  async preview(actorId:string, projectId:string, revision:number, bytes:Buffer, mime:string, label:string) {
    this.prune();
    if (this.active.has(actorId) || this.active.size >= 2 || this.previews.size >= 32 || this.lastAttempt.size >= 128 || this.now()-(this.lastAttempt.get(actorId)??-Infinity)<5000) throw new ApiError(429,'PDF_BUSY');
    this.active.add(actorId); this.lastAttempt.set(actorId,this.now());
    try {
      const pages = await this.parser(bytes, mime);
      const digest = createHash('sha256').update(bytes).digest('hex');
      const extractedAt = new Date(this.now()).toISOString();
      const value:PdfPreview = {token:randomUUID(),label:redactObviousCredentials(label.replace(/[\u0000-\u001f]/g,' ').trim()).slice(0,160)||'Geschäftsdokument.pdf',digest,extractedAt,expiresAt:new Date(this.now()+15*60000).toISOString(),expectedRevision:revision,pages:pages.length,...candidatesFromPages(pages,digest)};
      // A newer preview supersedes only this actor's preview for this project.
      for (const [key,item] of this.previews) if(item.actorId===actorId&&item.projectId===projectId)this.previews.delete(key);
      this.previews.set(value.token,{actorId,projectId,value});
      const token = value.token;
      setTimeout(()=>this.previews.delete(token),15*60000).unref();
      return value;
    } finally { this.active.delete(actorId); }
  }
  selected(actorId:string,projectId:string,token:string,ids:string[]) {
    this.prune(); const item=this.previews.get(token);
    if(!item||item.actorId!==actorId||item.projectId!==projectId)throw new ApiError(409,'PDF_PREVIEW_EXPIRED');
    const selected=item.value.candidates.filter(c=>ids.includes(c.id));
    if(!selected.length||new Set(ids).size!==ids.length||selected.length!==ids.length)throw new ApiError(400,'INVALID_INPUT');
    return {...item.value,candidates:selected};
  }
  consume(token:string) { this.previews.delete(token); }
}
