import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, Download, RotateCcw, Check, ChevronDown } from 'lucide-react';
import { downloadText } from '../sample';
import { curatedPosts, demoContext, demoFacts } from './demo01.data';
import { canReviewDemo, createDemo, editDemoPost, resetDemo, reviewDemo, reviewedDemoMarkdown } from './demo01.model';
import './curated-demo.css';

type Stage = 'edit' | 'review' | 'complete';
export default function CuratedDemo() {
  const [state, setState] = useState(createDemo);
  const [selected, setSelected] = useState(0);
  const [stage, setStage] = useState<Stage>('edit');
  const [notice, setNotice] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const editor = useRef<HTMLTextAreaElement>(null);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  useEffect(() => { if (stage !== 'edit') heading.current?.focus(); }, [stage]);
  useLayoutEffect(() => {
    const field = editor.current;
    if (stage !== 'edit' || !field) return;
    function fitText() {
      if (!field) return;
      field.style.height = 'auto';
      field.style.height = `${field.scrollHeight + 2}px`;
    }
    fitText();
    let previousWidth = field.getBoundingClientRect().width;
    const observer = new ResizeObserver(() => {
      const width = field.getBoundingClientRect().width;
      if (width !== previousWidth) { previousWidth = width; fitText(); }
    });
    observer.observe(field);
    return () => observer.disconnect();
  }, [state.pack.posts, selected, stage]);
  const ready = canReviewDemo(state);
  function reset() {
    setState(current => resetDemo(current)); setSelected(0); setStage('edit');
    setNotice('Alle drei Beispieltexte sind wiederhergestellt. Bitte prüfe sie vor dem Download erneut.');
  }
  function download() {
    try {
      downloadText(reviewedDemoMarkdown(state));
      setStage('complete'); setNotice('Download angefordert. Es wurde nichts veröffentlicht.');
    } catch { setNotice('Bitte prüfe die aktuelle Version erneut.'); }
  }
  return <div className="demo01">
    <header className="demo01-header">
      <p className="demo01-label">Kuratierte fiktive Demo · keine Live-KI</p>
      <h2 id="d2-demo-title" ref={heading} tabIndex={-1}>{stage === 'edit' ? 'Deine Beispielbeiträge.' : stage === 'review' ? 'Dein letzter Blick.' : 'Dein Download ist vorbereitet.'}</h2>
      <p className="demo01-business"><strong>{demoContext.businessName}</strong><span>Düsseldorf · LinkedIn</span></p>
      <p>{stage === 'edit' ? 'Drei Themen sind vorbereitet. Wähle einen Beitrag und passe den Text an.' : stage === 'review' ? 'Lies alle drei Texte. Genau diese Version wird heruntergeladen.' : 'Die Markdown-Datei wurde zum Herunterladen bereitgestellt. Es wurde nichts veröffentlicht.'}</p>
    </header>
    {stage === 'edit' && <>
      <div className="demo01-tabs" role="tablist" aria-label="Drei Beispielbeiträge">
        {curatedPosts.map((post, i) => <button key={post.theme} ref={el => { tabs.current[i] = el; }} id={`demo01-tab-${i}`} type="button" role="tab" aria-controls="demo01-post-panel" aria-selected={selected === i} tabIndex={selected === i ? 0 : -1} onClick={() => setSelected(i)} onKeyDown={e => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
          e.preventDefault(); const next = e.key === 'Home' ? 0 : e.key === 'End' ? 2 : (i + (e.key === 'ArrowRight' ? 1 : 2)) % 3;
          setSelected(next); tabs.current[next]?.focus();
        }}><strong>Post {i + 1}</strong><span>{post.label}</span></button>)}
      </div>
      <section className="demo01-editor" role="tabpanel" id="demo01-post-panel" aria-labelledby={`demo01-tab-${selected}`}>
        <div className="demo01-editor-heading"><label htmlFor="demo01-text">Text für Post {selected + 1}</label><span>LinkedIn</span></div>
        <textarea ref={editor} id="demo01-text" value={state.pack.posts[selected].text} maxLength={3000} rows={9} aria-describedby="demo01-edit-hint" onChange={e => { setState(current => editDemoPost(current, selected, e.target.value)); setNotice(''); }}/>
        <div className="demo01-editor-foot"><p id="demo01-edit-hint">Deine Änderungen bleiben beim Wechseln erhalten.</p><span>{state.pack.posts[selected].text.length.toLocaleString('de-DE')} / 3.000</span></div>
        <p className="demo01-source">Grundlage: {demoFacts[selected].statement} <span>Nur für dieses fiktive Beispiel bestätigt.</span></p>
      </section>
      {!ready && <p className="demo01-error" role="alert">Bitte fülle alle drei Beiträge aus, bevor du sie prüfst.</p>}
      <div className="demo01-action"><div><strong>Texte allein sind genug.</strong><span>Für den Download brauchst du kein Bild.</span></div><button className="demo01-primary" disabled={!ready} onClick={() => { setStage('review'); setNotice(''); }}>Prüfen & herunterladen<ArrowRight size={17} aria-hidden="true"/></button></div>
      <div className="demo01-secondary">
        <details><summary>Einstiege & Handlungsaufforderungen<ChevronDown size={17} aria-hidden="true"/></summary><p>Die ursprünglichen Einstiege (Hooks) und Einladungen (CTA). Maßgeblich für den Download ist dein vollständiger Text oben.</p><ol>{curatedPosts.map((post, i) => <li key={post.theme}><strong>Post {i + 1}</strong><p>{post.hook}</p><span>{post.cta}</span></li>)}</ol></details>
        <details><summary>7-Tage-Plan<ChevronDown size={17} aria-hidden="true"/></summary><p>Redaktionelle Vorschläge für dieses Beispiel. Keine terminierten oder automatisch veröffentlichten Beiträge.</p><ol>{state.pack.days.map(day => <li key={day.day}><strong>Tag {day.day}</strong><p>{day.task}</p></li>)}</ol></details>
        <details><summary>Worauf beruhen die Beispiele?<ChevronDown size={17} aria-hidden="true"/></summary><p>Glanz Büroservice ist vollständig erfunden. Nur diese drei Angaben wurden vom Owner für die Demo bestätigt:</p><ol>{demoFacts.map(fact => <li key={fact.id}>{fact.statement}</li>)}</ol><p>Neue Aussagen in deinen Änderungen werden nicht automatisch geprüft. Die Demo greift nicht auf echte Unternehmen oder deren Daten zu.</p></details>
      </div>
      <div className="demo01-reset"><button className="demo01-quiet" aria-label="Alle drei Beiträge auf das Beispiel zurücksetzen" onClick={reset}><RotateCcw size={14} aria-hidden="true"/>Beispiel zurücksetzen</button><small>Nur in diesem Browser · bis zum Neuladen</small></div>
    </>}
    {stage === 'review' && <>
      <div className="demo01-review-list">{state.pack.posts.map((post, i) => <section key={curatedPosts[i].theme}><h3>Post {i + 1} · {curatedPosts[i].label}</h3><pre>{post.text}</pre></section>)}</div>
      <p className="demo01-review-note">Fiktive, redaktionell vorbereitete Beispiele. Prüfe auch deine eigenen Änderungen: Neue Aussagen werden nicht automatisch auf Richtigkeit geprüft. Bilder sind nicht erforderlich.</p>
      <label className="demo01-check"><input type="checkbox" checked={state.reviewed !== null} onChange={e => { setState(current => e.target.checked ? reviewDemo(current) : { ...current, reviewed: null }); setNotice(''); }}/><span>Ich habe alle drei Beiträge geprüft.</span></label>
      <div className="demo01-action demo01-review-action"><button className="demo01-quiet" onClick={() => { setStage('edit'); setNotice(''); }}>Zurück bearbeiten</button><button className="demo01-primary" disabled={!state.reviewed} onClick={download}><Download size={17} aria-hidden="true"/>Texte herunterladen</button></div>
      <p className="demo01-file-note">Markdown-Datei · alle drei Texte, Einstiege und Plan · keine Veröffentlichung</p>
    </>}
    {stage === 'complete' && <section className="demo01-conversion">
      <span className="demo01-success" aria-hidden="true"><Check size={24}/></span>
      <h3>Stell dir das jetzt für dein eigenes Unternehmen vor.</h3>
      <p>Mit deinen Leistungen, deiner Zielgruppe und deinen eigenen Bildern.</p>
      <p className="demo01-explain">Im lokalen Produkt würdest du deine Unternehmensangaben bestätigen, ein Ziel wählen und die Entwürfe prüfen. Bilder bleiben optional. Der öffentliche Start ist noch nicht freigegeben.</p>
      <button className="demo01-primary" onClick={() => { setStage('edit'); setNotice(''); }}>Demo weiter bearbeiten<ArrowRight size={17} aria-hidden="true"/></button>
      <details className="demo01-pilot"><summary>Aktuellen Pilotstatus ansehen<ChevronDown size={17} aria-hidden="true"/></summary><p>Der externe Pilot bleibt geschlossen. Es gibt noch keine öffentliche Anmeldung, Warteliste, Buchung oder Bezahlung. Die Demo kannst du weiter ohne Konto ausprobieren.</p></details>
    </section>}
    <p className="demo01-notice" role="status">{notice}</p>
  </div>;
}
