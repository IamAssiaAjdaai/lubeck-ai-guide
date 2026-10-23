// @vitest-environment node
import { afterAll, describe, it, expect, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { randomUUID } from 'node:crypto';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Pool } from 'pg';
import sharp from 'sharp';
import type { Pack } from './pack.contract';
import { ProjectStore } from './store';
import { WorkspacePackService } from './workspace-packs';
import { WorkspaceService } from './workspace';
import { CreativeService } from './creative/service';
import { PrivateMedia } from './creative/storage';
import { createPackProvider } from './pack.provider';
const url = process.env.MARKETING_TEST_DATABASE_URL, pool = url ? new Pool({ connectionString: url, max: 12 }) : null, dirs: string[] = [];
afterAll(async () => {
    await pool?.end();
    for (const d of dirs)
        await rm(d, { recursive: true, force: true });
});
async function fixture(sparse = false) {
    const actor = { id: randomUUID() };
    await pool!.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,\'Synthetic UX\',$2,true)', [actor.id, `ux-${actor.id}@example.test`]);
    const store = new ProjectStore(pool!), project = await store.create(actor, 'Fiktiver Reinigungsbetrieb');
    const statements = sparse ? ['Wir reinigen Büros.'] : ['Wir reinigen Büros.', 'Eine Anfrage beginnt per E-Mail.', 'Bitte Unterlagen zum Termin mitbringen.'];
    await store.revise(actor, project.id, 0, { rawText: 'Synthetic only', identity: { name: 'Fiktiver Reinigungsbetrieb' }, facts: statements.map((statement, i) => ({ id: 'f' + i, statement })) });
    await store.confirm(actor, project.id, 1, statements.map((_, i) => 'f' + i));
    const dir = await mkdtemp(join(tmpdir(), 'ux-review-'));
    dirs.push(dir);
    let now = Date.now();
    const media = new PrivateMedia(dir), creative = new CreativeService(pool!, media, () => new Date(now)), workspace = new WorkspaceService(pool!, creative), provider = createPackProvider(true), factory = vi.fn(() => provider), packs = new WorkspacePackService(pool!, true, factory);
    const command = { expectedRevision: 2, goal: 'mehr_anfragen', audience: 'Büroleitungen', language: 'de-DE', channels: ['instagram'], idempotencyKey: randomUUID() };
    await workspace.draft(actor, project.id, { goal: command.goal, audience: command.audience, channel: 'instagram', expectedRevision: 2, themesReviewed: true });
    return { actor, store, project, creative, workspace, packs, command, factory, media, advance: () => { now += 25 * 3600000; } };
}
async function reviews(f: Awaited<ReturnType<typeof fixture>>, gid: string, image: {
    kind: 'job' | 'asset';
    id: string;
} | null = null) {
    for (let i = 0; i < 3; i++)
        await f.workspace.review(f.actor, f.project.id, gid, { expectedVersion: 1, postIndex: i, image: i === 0 ? image : null, acknowledged: true });
}
describe.skipIf(!url)('workspace persisted safety boundaries', () => {
    it('blocks sparse facts before provider initialization, attempts and global reservations', async () => { const f = await fixture(true); const before = (await pool!.query('SELECT * FROM mkt_global_usage')).rows; await expect(f.packs.generate(f.actor, f.project.id, f.command)).rejects.toMatchObject({ code: 'THREE_THEMES_REQUIRED' }); expect(f.factory).not.toHaveBeenCalled(); expect((await f.packs.usage(f.actor, f.project.id)).used).toBe(0); expect((await pool!.query('SELECT * FROM mkt_global_usage')).rows).toEqual(before); expect((await f.workspace.draft(f.actor, f.project.id)).audience).toBe('Büroleitungen'); });
    it('requires human theme confirmation bound to exact revision and command', async () => { const f = await fixture(); await f.workspace.draft(f.actor, f.project.id, { goal: 'mehr_anfragen', audience: 'Andere Zielgruppe', channel: 'instagram', expectedRevision: 2, themesReviewed: true }); await expect(f.packs.generate(f.actor, f.project.id, f.command)).rejects.toMatchObject({ code: 'THEMES_REVIEW_REQUIRED' }); expect(f.factory).not.toHaveBeenCalled(); });
    it('produces three distinct evidence topics; protects approvals, drafts and export cross-tenant', async () => {
        const f = await fixture(), other = await fixture(), j = await f.packs.generate(f.actor, f.project.id, f.command);
        expect(new Set(j.versions[0].content.posts.map((p: Pack["posts"][number]) => p.factIds[0])).size).toBe(3);
        await expect(f.workspace.export(f.actor, f.project.id, j.id, { expectedVersion: 1, scope: 'texts' })).rejects.toMatchObject({ code: 'POST_REVIEW_REQUIRED' });
        await reviews(f, j.id);
        await expect(f.workspace.review(other.actor, f.project.id, j.id, { expectedVersion: 1, postIndex: 0, image: null, acknowledged: true })).rejects.toMatchObject({ code: 'PROJECT_NOT_FOUND' });
        await expect(f.workspace.draft(other.actor, f.project.id)).rejects.toMatchObject({ code: 'PROJECT_NOT_FOUND' });
        await expect(f.workspace.export(other.actor, f.project.id, j.id, { expectedVersion: 1, scope: 'texts' })).rejects.toMatchObject({ code: 'PROJECT_NOT_FOUND' });
        const output = await f.workspace.export(f.actor, f.project.id, j.id, { expectedVersion: 1, scope: 'texts' });
        expect(output.files.filter(f => f.name.endsWith('beitrag.md'))).toHaveLength(3);
        expect(output.files.some(f => f.name.endsWith('.png'))).toBe(false);
        const text = output.files.map(x => Buffer.from(x.base64, 'base64').toString()).join(' ');
        for (const forbidden of [f.actor.id, 'snapshot', 'outputKey', 'api_key'])
            expect(text).not.toContain(forbidden);
    });
    it('invalidates review after saved edits and refuses historical export', async () => { const f = await fixture(), j = await f.packs.generate(f.actor, f.project.id, f.command); await reviews(f, j.id); const p = j.versions[0].content; await f.packs.edit(f.actor, f.project.id, j.id, { expectedVersion: 1, posts: p.posts.map((x: Pack["posts"][number]) => x.text + ' Neue Redaktion.'), hooks: p.hooks, cta: p.cta }); expect((await f.workspace.reviews(f.actor, f.project.id, j.id, 2)).every(r => !r.approved)).toBe(true); await expect(f.workspace.export(f.actor, f.project.id, j.id, { expectedVersion: 1, scope: 'texts' })).rejects.toMatchObject({ code: 'STALE_VERSION' }); });
    it('revalidates source bytes and approvals, while text-only export remains available', async () => { const f = await fixture(), j = await f.packs.generate(f.actor, f.project.id, f.command); const bytes = await sharp({ create: { width: 80, height: 80, channels: 4, background: '#162d2c' } }).png().toBuffer(); let a = await f.creative.upload(f.actor, f.project.id, bytes, 'image/png'); a = await f.creative.metadata(f.actor, f.project.id, a.id, { expectedRevision: a.revision, name: 'Eigene synthetische Quelle', alt: 'Geometrisches Testbild', role: 'business_photo' }); await f.creative.approveAsset(f.actor, f.project.id, a.id, { expectedRevision: a.revision, rightsConfirmed: true, sourceConfirmed: true }); await reviews(f, j.id, { kind: 'asset', id: a.id }); expect((await f.workspace.export(f.actor, f.project.id, j.id, { expectedVersion: 1, scope: 'campaign' })).files.some(x => x.name.endsWith('bild.png'))).toBe(true); await writeFile(join(f.media.directory, a.id), Buffer.from('tampered')); await expect(f.workspace.export(f.actor, f.project.id, j.id, { expectedVersion: 1, scope: 'campaign' })).rejects.toMatchObject({ code: 'ASSET_INTEGRITY_FAILED' }); await expect(f.workspace.export(f.actor, f.project.id, j.id, { expectedVersion: 1, scope: 'texts' })).resolves.toBeTruthy(); });
    it('keeps mock expiry scoped to campaign downloads and respects exact post binding', async () => { const f = await fixture(), j = await f.packs.generate(f.actor, f.project.id, f.command); const img = await f.creative.enqueue(f.actor, f.project.id, 'image', { generationId: j.id, expectedVersion: 1, postIndex: 0, objective: 'leistung_erklaeren', ratio: '1:1', idempotencyKey: randomUUID() }); await f.creative.processImage(f.actor, f.project.id, img.id); const output = await f.creative.output(f.actor, f.project.id, img.id); await f.creative.review(f.actor, f.project.id, img.id, { outputHash: output.metadata.outputHash, imageReviewed: true, textReviewed: true, syntheticAcknowledged: true }); await f.creative.attach(f.actor, f.project.id, img.id); await expect(f.workspace.review(f.actor, f.project.id, j.id, { expectedVersion: 1, postIndex: 1, image: { kind: 'job', id: img.id }, acknowledged: true })).rejects.toMatchObject({ code: 'CREATIVE_REVIEW_STALE' }); await reviews(f, j.id, { kind: 'job', id: img.id }); f.advance(); await expect(f.workspace.export(f.actor, f.project.id, j.id, { expectedVersion: 1, scope: 'campaign' })).rejects.toMatchObject({ code: 'CREATIVE_UNAVAILABLE' }); expect((await f.workspace.reviews(f.actor, f.project.id, j.id, 1))[0]).toMatchObject({ approved: false, textApproved: true }); await expect(f.workspace.export(f.actor, f.project.id, j.id, { expectedVersion: 1, scope: 'texts' })).resolves.toBeTruthy(); });

    it('reuses valid mock pixels after a text edit with fresh combined approval and no new attempt',async()=>{
      const f=await fixture(),j=await f.packs.generate(f.actor,f.project.id,f.command);
      const image=await f.creative.enqueue(f.actor,f.project.id,'image',{generationId:j.id,expectedVersion:1,postIndex:0,objective:'leistung_erklaeren',ratio:'1:1',idempotencyKey:randomUUID()});await f.creative.processImage(f.actor,f.project.id,image.id);
      const before=await f.creative.output(f.actor,f.project.id,image.id);const p=j.versions[0].content as Pack;
      const usage=(await f.creative.read(f.actor,f.project.id)).usage;
      await f.packs.edit(f.actor,f.project.id,j.id,{expectedVersion:1,posts:p.posts.map(post=>post.text+' Redaktion.'),hooks:p.hooks,cta:p.cta});
      await f.creative.rebindForWorkspace(f.actor,f.project.id,image.id,{expectedVersion:2});
      const after=await f.creative.output(f.actor,f.project.id,image.id);expect(after.bytes).toEqual(before.bytes);expect((await f.creative.read(f.actor,f.project.id)).usage).toEqual(usage);
      await expect(f.workspace.review(f.actor,f.project.id,j.id,{expectedVersion:2,postIndex:0,image:{kind:'job',id:image.id},acknowledged:true})).rejects.toMatchObject({code:'CREATIVE_REVIEW_REQUIRED'});
      await f.creative.review(f.actor,f.project.id,image.id,{outputHash:after.metadata.outputHash,imageReviewed:true,textReviewed:true,syntheticAcknowledged:true});await f.creative.attach(f.actor,f.project.id,image.id);
      await expect(f.workspace.review(f.actor,f.project.id,j.id,{expectedVersion:2,postIndex:0,image:{kind:'job',id:image.id},acknowledged:true})).resolves.toMatchObject({approved:true});
      f.advance();await expect(f.creative.rebindForWorkspace(f.actor,f.project.id,image.id,{expectedVersion:2})).rejects.toMatchObject({code:'CREATIVE_UNAVAILABLE'});
    });
});
