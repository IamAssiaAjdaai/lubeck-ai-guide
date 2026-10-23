import { packMarkdown, type Pack } from '../../../../marketing-saas-api/src/pack.contract';
import { curatedPosts, demoContext, demoFacts, demoPlan } from './demo01.data';

export type DemoState = Readonly<{
  pack: Pack;
  version: number;
  reviewed: Readonly<{ version: number; content: string; markdown: string }> | null;
}>;

export function createDemo(version = 1): DemoState {
  return {
    version, reviewed: null,
    pack: {
      schemaVersion: 1,
      businessName: `${demoContext.businessName} · fiktiv`,
      language: 'de-DE', goal: 'Die drei Beispielthemen verständlich vorstellen',
      audience: 'Büroleitungen in Düsseldorf (fiktive Zielgruppe)',
      editorialStatus: 'draft',
      facts: demoFacts.map(f => ({ ...f, sourceUrls: [] })),
      posts: curatedPosts.map(p => ({ channel: 'linkedin', text: [p.hook, p.claim, p.editorial, p.cta].join('\n\n'), factIds: [p.factId] })),
      hooks: curatedPosts.map(p => p.hook),
      cta: curatedPosts.map((p, i) => `Beitrag ${i + 1}: ${p.cta}`).join('\n'),
      days: demoPlan.map((d, i) => ({ day: i + 1, channel: 'linkedin', task: d.task, time: '09:00', factIds: [d.factId] })),
    },
  };
}

export function editDemoPost(state: DemoState, index: number, text: string): DemoState {
  if (!Number.isInteger(index) || index < 0 || index > 2 || text.length > 3000) throw new Error('Ungültiger Demo-Text.');
  if (state.pack.posts[index].text === text) return state;
  return {
    version: state.version + 1, reviewed: null,
    pack: { ...state.pack, editorialStatus: 'human_edited', posts: state.pack.posts.map((p, i) => i === index ? { ...p, text } : p) },
  };
}
export function canReviewDemo(state: DemoState) {
  return state.pack.posts.length === 3 && state.pack.posts.every(p => p.text.trim().length > 0 && p.text.length <= 3000);
}
export function reviewDemo(state: DemoState): DemoState {
  if (!canReviewDemo(state)) throw new Error('Bitte fülle alle drei Beiträge aus.');
  const markdown = [
    '# KURATIERTE FIKTIVE DEMO — keine Live-KI',
    'Glanz Büroservice ist frei erfunden. Die Demo-Angaben wurden vom Owner ausschließlich für dieses fiktive Beispiel bestätigt. Keine realen Unternehmensdaten oder verifizierten Kundenangaben.',
    'Die Texte wurden redaktionell vorbereitet, nicht von einem Live-Modell erzeugt. Ein Bild ist für diesen Text-Export nicht nötig.',
    packMarkdown(state.pack, 'demo', 'curated-demo01', state.version),
    'Die Faktenreferenzen betreffen die kuratierte Ursprungsversion. Eigene Änderungen werden nicht automatisch auf neue oder unbelegte Aussagen geprüft. Prüfe deinen gesamten Text selbst. Es wurde nichts veröffentlicht.',
  ].join('\n\n');
  return { ...state, reviewed: Object.freeze({ version: state.version, content: JSON.stringify(state.pack), markdown }) };
}
export function reviewedDemoMarkdown(state: DemoState) {
  if (!state.reviewed || state.reviewed.version !== state.version || state.reviewed.content !== JSON.stringify(state.pack)) {
    throw new Error('Bitte prüfe die aktuelle Version erneut.');
  }
  return state.reviewed.markdown;
}
export function resetDemo(state: DemoState) { return createDemo(state.version + 1); }
