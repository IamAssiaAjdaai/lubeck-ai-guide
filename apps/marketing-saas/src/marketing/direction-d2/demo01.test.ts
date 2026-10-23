import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { curatedPosts, demoFacts } from './demo01.data';
import { canReviewDemo, createDemo, editDemoPost, resetDemo, reviewDemo, reviewedDemoMarkdown } from './demo01.model';

afterEach(() => vi.unstubAllGlobals());
describe('curated fictional demo, not model-quality validation', () => {
  it('pins exactly the three owner-confirmed fictional facts and three different supported themes', () => {
    expect(demoFacts.map(f => f.statement)).toEqual([
      'Büroreinigung für Unternehmen in Düsseldorf.',
      'Regelmäßige Unterhaltsreinigung für Büroräume.',
      'Möglichkeit, ein persönliches Erstgespräch anzufragen.',
    ]);
    expect(curatedPosts.map(p => [p.theme, p.factId])).toEqual([
      ['service', 'demo01-f1'], ['regular', 'demo01-f2'], ['conversation', 'demo01-f3'],
    ]);
    expect(curatedPosts.map(p => p.claim)).toEqual([
      'Glanz Büroservice bietet Büroreinigung für Unternehmen in Düsseldorf an.',
      'Glanz Büroservice bietet regelmäßige Unterhaltsreinigung für Büroräume an.',
      'Bei Glanz Büroservice kannst du ein persönliches Erstgespräch anfragen.',
    ]);
  });
  it('provides distinct curated bodies, hooks and CTAs with LinkedIn and valid source references', () => {
    const { pack } = createDemo();
    for (const values of [pack.posts.map(p => p.text), curatedPosts.map(p => p.hook), curatedPosts.map(p => p.claim), curatedPosts.map(p => p.cta)]) expect(new Set(values).size).toBe(3);
    expect(pack.posts.map(p => p.channel)).toEqual(['linkedin', 'linkedin', 'linkedin']);
    for (const item of [...pack.posts, ...pack.days]) for (const id of item.factIds) expect(pack.facts.some(f => f.id === id)).toBe(true);
    const text = pack.posts.map(p => p.text).join('\n');
    // Regression sentinels for this finite authored fixture; never a semantic truth guarantee.
    expect(text).not.toMatch(/\d|€|zertifiz|garant|kostenlos|umsatz|bewertung|erfahrung|team|zeit sparen|produktiver|nachhaltig|desinfiz|allerg|mehr kunden/i);
    expect(pack.facts.every(f => f.sourceUrls.length === 0)).toBe(true);
  });
  it('contains seven manual suggestions, never queued publishing or required images', () => {
    const state = createDemo();
    expect(state.pack.days.map(d => d.day)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(state.pack.days[3].task).toContain('Text allein ist auch möglich');
    expect(state.pack.days[5].task).toContain('manuell');
    expect(canReviewDemo(state)).toBe(true);
    expect(reviewedDemoMarkdown(reviewDemo(state))).toContain('Ein Bild ist für diesen Text-Export nicht nötig.');
  });
  it('does not share edited content or fact arrays between visitors or reset examples', () => {
    const first = createDemo(), second = createDemo();
    const changed = editDemoPost(first, 1, 'Mein eigener lokaler Testtext.');
    expect(changed.pack.posts[1].text).not.toBe(second.pack.posts[1].text);
    expect(first.pack.posts[1].text).toBe(second.pack.posts[1].text);
    expect(first.pack.facts).not.toBe(second.pack.facts);
    expect(first.pack.posts[0].factIds).not.toBe(second.pack.posts[0].factIds);
    expect(JSON.stringify(first)).not.toMatch(/tenantId|actorId|apiKey|organizationId|sessionToken/);
  });
  it('changes versions immutably and preserves exact whitespace, German and markup as text', () => {
    const first = createDemo(), text = '  Büro & Gespräch — „Düsseldorf“\n\n<img src="https://example.invalid/x">\n  ';
    const changed = editDemoPost(first, 0, text);
    expect(changed.version).toBe(first.version + 1);
    expect(changed.pack.posts[0].text).toBe(text);
    expect(changed.pack.posts[1]).toBe(first.pack.posts[1]);
    expect(first.pack.editorialStatus).toBe('draft');
    expect(changed.pack.editorialStatus).toBe('human_edited');
    const reviewed = reviewDemo(changed);
    expect(reviewedDemoMarkdown(reviewed)).toBe(reviewed.reviewed?.markdown);
    expect(reviewedDemoMarkdown(reviewed)).toContain(text);
    expect(reviewedDemoMarkdown(reviewed)).toContain('Eigene Änderungen werden nicht automatisch');
  });
  it('rejects export without review, after edit, after reset, with stale version or tampered content', () => {
    const initial = createDemo();
    expect(() => reviewedDemoMarkdown(initial)).toThrow('aktuelle Version');
    const reviewed = reviewDemo(initial);
    expect(() => reviewedDemoMarkdown(editDemoPost(reviewed, 2, 'Geändert.'))).toThrow();
    expect(() => reviewedDemoMarkdown(resetDemo(reviewed))).toThrow();
    expect(() => reviewedDemoMarkdown({ ...reviewed, version: reviewed.version + 1 })).toThrow();
    const tampered = { ...reviewed, pack: { ...reviewed.pack, hooks: ['Anderer Einstieg', ...reviewed.pack.hooks.slice(1)] } };
    expect(() => reviewedDemoMarkdown(tampered)).toThrow();
    expect(Object.isFrozen(reviewed.reviewed)).toBe(true);
  });
  it('is idempotent for repeated downloads and no-op edits of exactly the reviewed text', () => {
    const reviewed = reviewDemo(createDemo());
    const unchanged = editDemoPost(reviewed, 0, reviewed.pack.posts[0].text);
    expect(unchanged).toBe(reviewed);
    expect(reviewedDemoMarkdown(unchanged)).toBe(reviewedDemoMarkdown(reviewed));
  });
  it('restores all three originals explicitly, increments version and clears review', () => {
    let state = createDemo();
    for (let i = 0; i < 3; i++) state = editDemoPost(state, i, `Änderung ${i}`);
    const reviewed = reviewDemo(state), reset = resetDemo(reviewed);
    expect(reset.pack).toEqual(createDemo().pack);
    expect(reset.version).toBe(reviewed.version + 1);
    expect(reset.reviewed).toBeNull();
  });
  it('fails closed on empty, oversized or missing post edits without losing earlier state', () => {
    const state = createDemo();
    const empty = editDemoPost(state, 1, '  \n ');
    expect(canReviewDemo(empty)).toBe(false);
    expect(() => reviewDemo(empty)).toThrow('alle drei');
    for (const index of [-1, 3, 0.5, NaN]) expect(() => editDemoPost(state, index, 'Text')).toThrow();
    expect(() => editDemoPost(state, 0, 'a'.repeat(3001))).toThrow();
    expect(canReviewDemo(state)).toBe(true);
  });
  it('executes with every network request forbidden and imports no tenant/provider layer', () => {
    const deny = vi.fn(() => { throw Error('NETWORK_FORBIDDEN'); });
    vi.stubGlobal('fetch', deny);
    vi.stubGlobal('XMLHttpRequest', deny);
    vi.stubGlobal('WebSocket', deny);
    const state = reviewDemo(editDemoPost(createDemo(), 0, 'Rein lokaler Redaktionstest.'));
    expect(reviewedDemoMarkdown(state)).toContain('Rein lokaler Redaktionstest.');
    expect(deny).not.toHaveBeenCalled();
    const model = readFileSync('apps/marketing-saas/src/marketing/direction-d2/demo01.model.ts', 'utf8');
    expect(model).not.toMatch(/fetch\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|api\.ts|pack\.provider|tenant|process\.env/);
    expect(model.match(/^import /gm)).toHaveLength(2);
  });
});
