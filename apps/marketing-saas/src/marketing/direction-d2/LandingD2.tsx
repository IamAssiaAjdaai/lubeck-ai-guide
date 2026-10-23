/* eslint-disable @next/next/no-img-element -- Independent Vite preview, optimized local assets. */
import { useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Play, FileText, Image as ImageIcon, CalendarDays, Video, ShieldCheck, Download, Sparkles, Camera, Building2, Brush, Wrench, Store, Coffee, Flower2, BriefcaseBusiness, Menu, X, Plus, Check } from 'lucide-react';
import { brandIdentity } from '../../brand/identity';
import CuratedDemo from './CuratedDemo';
import { useD2Motion } from './useD2Motion';
import './polish09.css';

const nav = [['Funktionen','funktionen'],['So funktioniert’s','ablauf'],['Beispiele','beispiele'],['FAQ','faq']];
const categories = [
  {name:'Reinigung',id:'CAT-01',icon:Brush,description:'Leistungen erklären und typische Fragen beantworten.'},
  {name:'Handwerk',id:'CAT-02',icon:Wrench,description:'Deine Arbeitsweise und dein Fachwissen verständlich zeigen.'},
  {name:'Einzelhandel',id:'CAT-03',icon:Store,description:'Dein Sortiment und deine Beratung zum Thema machen.'},
  {name:'Gastronomie',id:'CAT-04',icon:Coffee,description:'Dein Angebot und deine Gastfreundschaft vorstellen.'},
  {name:'Beauty & Wellness',id:'CAT-05',icon:Flower2,description:'Deine Leistungen erklären, ohne Wirkungsversprechen zu erfinden.'},
  {name:'Dienstleistungen',id:'CAT-06',icon:BriefcaseBusiness,description:'Deine Schwerpunkte auf den Punkt bringen.'},
];
const faq = [
  ['Was kann ich heute ausprobieren?', 'Die lokale Demo zeigt drei bearbeitbare, kuratierte deutsche Textbeispiele, drei Einstiege und einen Sieben-Tage-Plan. Nach deiner Prüfung kannst du einen ausdrücklich fiktiven Markdown-Entwurf herunterladen. Es gibt keine Anmeldung, Datenerfassung oder Modellanfrage in dieser Vorschau.'],
  ['Was bedeuten die Fotos und Bildfunktionen?', 'Die Fotos wurden mit KI als separate synthetische Designmotive erstellt. Sie zeigen keine echten Kunden, Mitarbeitenden, Räume oder Arbeitsergebnisse. Im authentifizierten Arbeitsbereich gibt es Brand Kit, Medienbibliothek und einen klar markierten Mock-Bildablauf. Echte Bildanbieter sind weiterhin deaktiviert.'],
  ['Wie bleiben meine Unternehmensangaben unter meiner Kontrolle?', 'Im lokalen Produkt prüfst du vorgeschlagene Fakten und ihre Quellen, bevor sie verwendet werden. Danach kannst du Themen und Texte prüfen und bearbeiten. Bestätigungen sind keine automatische Garantie für Richtigkeit, Sicherheit oder Textqualität. Du prüfst die genaue Version vor dem Export.'],
  ['Veröffentlicht das Produkt automatisch?', 'Nein. Du lädst die geprüften Texte beziehungsweise Texte mit freigegebenen Bildern manuell herunter und veröffentlichst selbst. Es gibt keine automatische Veröffentlichung oder Verbindung zu Social-Media-Konten.'],
  ['Kann ich das Produkt buchen oder am Pilot teilnehmen?', 'Noch nicht. Der externe Pilot ist geschlossen. Es gibt keine öffentliche Registrierung, Warteliste, Kontaktaufnahme, aktive Testphase, Bezahlung oder buchbare Preisliste auf dieser Vorschau. Live-KI, Betrieb, Datenschutz und rechtliche Angaben benötigen weitere Freigaben.'],
  ['Sind Video-Ideen schon verfügbar?', 'Nein. Video ist geplant. Es gibt derzeit nur lokale Mock-Job-Schnittstellen, keine Videoerzeugung, keine abspielbaren Ergebnisse und keine Seedance-Aufrufe. Das gezeigte Vorschaubild ist ein statisches synthetisches Motiv.'],
];

  function DemoButton({light=false,onClick}:{light?:boolean;onClick:()=>void}) {return <button className={`d2-button${light?' d2-button-light':''}`} onClick={onClick}>Demo ansehen<ArrowRight size={18} aria-hidden="true"/></button>;}

export default function LandingD2() {
  const [menu,setMenu] = useState(false);
  const [category,setCategory] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const page = useRef<HTMLDivElement>(null);
  const motion = useD2Motion(page);
  function openDemo() { dialog.current?.showModal(); }

  return <div className="d2-page" ref={page}>
    <a className="d2-skip" href="#d2-inhalt">Zum Inhalt</a>
    <header className="d2-header d2-container" data-section="header">
      <a className="d2-brand" href="#" aria-label={`${brandIdentity.name}, Seitenanfang`}><span aria-hidden="true" className="d2-mark">m<span>·</span></span><span>Marketing<strong>Workspace</strong></span></a>
      <nav aria-label="Hauptnavigation" className="d2-nav">{nav.map(([name,id])=><a key={id} href={`#${id}`}>{name}</a>)}<a href="/auth">Login</a></nav>
      <DemoButton onClick={openDemo}/>
      <button className="d2-menu-toggle" aria-expanded={menu} aria-controls="d2-menu" aria-label={menu?'Menü schließen':'Menü öffnen'} onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button>
      {menu&&<nav id="d2-menu" className="d2-menu" aria-label="Mobile Hauptnavigation" onKeyDown={e=>{if(e.key==='Escape'){setMenu(false);document.querySelector<HTMLButtonElement>('.d2-menu-toggle')?.focus();}}}>{nav.map(([name,id])=><a key={id} href={`#${id}`} onClick={()=>setMenu(false)}>{name}<ArrowUpRight size={16}/></a>)}<a href="/auth">Login · bestehendes Testkonto</a></nav>}
    </header>
    <main id="d2-inhalt" tabIndex={-1}>
      <section className="d2-hero d2-container" aria-labelledby="d2-title" data-section="hero">
        <div className="d2-hero-copy"><p className="d2-eyebrow">Marketing für dein Unternehmen</p><h1 id="d2-title">Dein<br className="d2-head-break"/> Unternehmen.<br/><span className="d2-story-line">Deine Geschichte.</span><br/><em>Sichtbar gemacht.</em></h1><p className="d2-lead">Erstelle passende Social-Media-Beiträge, Bildideen und Marketingpläne auf Basis der Informationen deines Unternehmens. Einfach prüfen, bearbeiten und herunterladen.</p><div className="d2-actions"><DemoButton onClick={openDemo}/><a className="d2-button d2-secondary" href="#ablauf"><Play size={16} aria-hidden="true"/>So funktioniert’s</a></div><p className="d2-demo-status"><span/>Geschlossener Pilot · Text-Demo & Bild-Mocks · keine Live-KI</p></div>
        <figure className="d2-hero-art"><span className="d2-shape d2-shape-forest"/><span className="d2-shape d2-shape-lime"/><span className="d2-shape d2-shape-lilac"/><img className="d2-portrait" src="/landing-d2/HERO-01.webp" width="1120" height="1400" alt="Synthetisches Editorial-Motiv einer fiktiven Floristin mit einem Blumenstrauß im warmen Ladenlicht." fetchPriority="high"/>
          <div className="d2-social-card"><div><strong>Neuer Beitrag</strong><Camera size={22} aria-hidden="true"/></div><img src="/landing-d2/HERO-02.webp" width="600" height="400" alt="Synthetische Bildidee: ein heller Blumenladen mit Pflanzen und warmem Holz."/><h3>Frische Blumen für<br/>deinen Alltag.</h3><p>#Blumen &nbsp; #Lokal &nbsp; #Inspiration</p><small>Fiktives Text- und Bildbeispiel</small></div>
          <div className="d2-deliverables"><strong>Im Demo-Pack</strong><div className="d2-paper-symbols" aria-hidden="true"><FileText/><ImageIcon/><CalendarDays/></div><span><FileText/>3 Textentwürfe</span><span><Sparkles/>3 Einstiege</span><span><CalendarDays/>7-Tage-Plan</span><small>Bilder im Produkt: nur Mock</small></div>
          <div className="d2-art-note"><Sparkles size={28}/><span>Dein Wissen gibt die Richtung.<br/><strong>Du behältst das letzte Wort.</strong></span></div>
          <figcaption>Synthetische Designmotive · keine Kundenreferenz</figcaption>
        </figure>
      </section>
      <section className="d2-benefit-strip" aria-label="Produktprinzipien" data-section="benefits"><div className="d2-container"><div><span><Building2/></span><p><strong>Unternehmensbezogene Inhalte</strong><small>Bestätigte Angaben als Grundlage</small></p></div><div><span><ShieldCheck/></span><p><strong>Du behältst die Kontrolle</strong><small>Einfach prüfen und anpassen</small></p></div><div><span><Download/></span><p><strong>Manuell herunterladen</strong><small>Texte oder Texte mit freigegebenen Bildern</small></p></div></div></section>
      <section data-d2-reveal id="ablauf" className="d2-section d2-container" data-section="workflow"><div className="d2-heading-row"><div><p className="d2-eyebrow">So einfach funktioniert’s</p><h2>In drei Schritten zu starken Inhalten.</h2></div><a className="d2-inline-link" href="#faq">So funktioniert’s im Detail<ArrowRight size={17}/></a></div><ol className="d2-steps">{[
        {icon:CalendarDays,title:'Unternehmen vorstellen',text:'Website oder kurze Angaben. Du prüfst die vorgeschlagenen Informationen und bestätigst, was verwendet werden darf.'},
        {icon:Sparkles,title:'Inhalte vorbereiten',text:'Wähle Ziel, Kanal und Zielgruppe. Die lokale Demo bereitet Texte aus festen Vorlagen und einen Sieben-Tage-Plan vor.'},
        {icon:Check,title:'Prüfen & herunterladen',text:'Überarbeite die Ergebnisse, füge bei Bedarf freigegebene Bilder hinzu und lade deine Inhalte manuell herunter.'},
      ].map((step,i)=><li key={step.title}><span className={`d2-number d2-tone-${i}`}>0{i+1}</span><step.icon aria-hidden="true"/><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol></section>
      <section id="funktionen" className="d2-features" data-section="features"><div className="d2-container"><div className="d2-heading-row"><div><p className="d2-eyebrow">Das kannst du vorbereiten</p><h2>Alles für deinen<br/>Social-Media-Auftritt.</h2></div><button className="d2-inline-link" onClick={openDemo}>Textbeispiel ausprobieren<ArrowRight size={17}/></button></div><div className="d2-feature-grid">
        <article data-d2-reveal className="d2-feature d2-feature-post"><div className="d2-feature-title"><span><FileText/></span><h3>Social-Media-Beiträge</h3></div><p>Drei bearbeitbare Texte aus bestätigten Angaben.</p><div className="d2-post-snippet"><div><strong>Neuer Beitrag</strong><FileText size={12}/></div><span>Grünes Wissen.<br/>Einfach weitergegeben.</span><img src="/landing-d2/FEAT-02.webp" alt="Synthetisches Blumenmotiv in warmen Apricot- und Cremetönen." width="600" height="400" loading="lazy"/><small>Feste Text-Demo · fiktiv</small></div></article>
        <article data-d2-reveal className="d2-feature d2-feature-photo"><div className="d2-feature-title"><span><ImageIcon/></span><h3>Bilder für deine Beiträge</h3></div><p>Eigene freigegebene Medien. Neue Bildabläufe als Mock.</p><div className="d2-photo-snippet"><img src="/landing-d2/FEAT-02.webp" alt="Synthetische florale Bildidee, keine Produktaufnahme eines echten Unternehmens." width="600" height="400" loading="lazy"/><span><ImageIcon/></span></div><small className="d2-feature-disclosure">Designfoto · Bildgenerierung im Produkt deaktiviert</small></article>
        <article data-d2-reveal className="d2-feature d2-feature-plan"><div className="d2-feature-title"><span><CalendarDays/></span><h3>7-Tage-Marketingplan</h3></div><p>Konkrete Vorschläge für deine nächsten Themen.</p><ol className="d2-plan"><li><span>Mo</span>Deine Leistung vorstellen</li><li><span>Mi</span>Eine häufige Frage beantworten</li><li><span>Fr</span>Zum Gespräch einladen</li></ol><small className="d2-feature-disclosure">Beispielauszug · du veröffentlichst selbst</small></article>
        <article data-d2-reveal className="d2-feature d2-feature-video"><div className="d2-feature-title"><span><Video/></span><h3>Video-Ideen <small>(geplant)</small></h3></div><p>Drehbuch und Storyboard sind eine Idee für später.</p><div className="d2-video-poster"><img src="/landing-d2/FEAT-04.webp" alt="Statisches synthetisches Motiv eines fiktiven Café-Inhabers. Keine Videofunktion." width="600" height="400" loading="lazy"/><span>In Planung</span><i aria-hidden="true"><Video/></i></div><small className="d2-feature-disclosure">Statisches Designmotiv · kein Video</small></article>
      </div></div></section>
      <section data-d2-reveal id="beispiele" className="d2-section d2-container d2-categories" data-section="categories"><div className="d2-heading-row"><div><p className="d2-eyebrow">Für welche Unternehmen?</p><h2>Ideal für lokale Unternehmen.</h2></div><p>Ob Dienstleistung, Handwerk oder Einzelhandel:<br/>Mach verständlich, was deinen Betrieb ausmacht.</p></div><div className="d2-category-grid" role="group" aria-label="Branchenbeispiel wählen">{categories.map((item,i)=><button key={item.id} onClick={()=>setCategory(i)} aria-pressed={category===i}><img src={`/landing-d2/${item.id}.webp`} width="480" height="360" loading="lazy" alt={`Synthetisches Branchenmotiv: ${item.name}, kein echtes Kundenunternehmen.`}/><span><item.icon size={16}/>{item.name}</span></button>)}</div><div className="d2-category-caption" role="status"><span>{categories[category].name}: {categories[category].description}</span><small>Alle Fotos sind synthetische Designmotive, keine Kundenreferenzen.</small></div></section>
      <section data-d2-reveal id="faq" className="d2-container d2-faq" data-section="faq"><div><p className="d2-eyebrow">Gut zu wissen</p><h2>Ein paar Fragen.<br/>Klare Antworten.</h2><p>Was heute möglich ist —<br/>und was noch Freigaben braucht.</p></div><div>{faq.map(([q,a])=><details key={q}><summary>{q}<Plus size={18} aria-hidden="true"/></summary><p>{a}</p></details>)}</div></section>
      <section className="d2-closing" data-section="closing"><img src="/landing-d2/CTA-01.webp" width="1600" height="700" loading="lazy" alt=""/><div className="d2-container"><div><p className="d2-eyebrow">Dein nächster Schritt</p><h2>Mach aus deinen Unternehmensinformationen<br/>hilfreiche Marketing-Inhalte.</h2><p>Probier die feste Text-Demo. Ohne Konto. Ohne Modellkosten.</p></div><DemoButton light onClick={openDemo}/></div></section>
    </main>
    <footer className="d2-footer" data-section="footer">
      <div className="d2-container">
        <div className="d2-footer-grid">
          <div className="d2-footer-identity" id="d2-pilot-status">
            <a className="d2-brand" href="#" aria-label={`${brandIdentity.name}, Seitenanfang`}><span aria-hidden="true" className="d2-mark">m<span>·</span></span><strong>{brandIdentity.name}</strong></a>
            <p>Dein Wissen wird zu verständlichen Inhalten. Du prüfst, bearbeitest und veröffentlichst selbst.</p>
            <p className="d2-footer-status">Pilot und öffentliche Registrierung bleiben geschlossen.</p>
            <small>Die fiktive Text-Demo ist ohne Konto verfügbar. Keine Buchung, Warteliste oder Datenerfassung.</small>
          </div>
          <nav aria-label="Produkt im Footer"><h3>Produkt</h3><a href="#funktionen">Funktionen</a><a href="#ablauf">So funktioniert’s</a><a href="#beispiele">Beispiele</a><button type="button" onClick={openDemo}>Demo ansehen</button></nav>
          <nav aria-label="Zugang im Footer"><h3>Zugang</h3><a href="/auth">Login · Testkonto</a><button type="button" onClick={openDemo}>Demo ansehen</button><a href="#d2-pilot-status">Pilotstatus</a></nav>
          <nav aria-label="Rechtliches im Footer"><h3>Rechtliches</h3><a href="/rechtliches#impressum">Impressum · Status</a><a href="/rechtliches#datenschutz">Datenschutz · Status</a><a href="/rechtliches#bedingungen">Bedingungen · Status</a></nav>
        </div>
        <div className="d2-footer-bottom"><p>Arbeitsname · Name in Prüfung.<br/>Keine automatische Veröffentlichung · keine Live-KI.</p><button type="button" className="d2-motion-control" disabled={motion.reduced} aria-pressed={motion.paused || motion.reduced} onClick={motion.toggle}>{motion.reduced ? 'Bewegung reduziert' : motion.paused ? 'Bewegung aktivieren' : 'Bewegung pausieren'}</button></div>
      </div>
    </footer>
    <dialog ref={dialog} className="d2-demo-dialog" aria-labelledby="d2-demo-title"><button className="d2-demo-close" aria-label="Demo schließen" onClick={()=>dialog.current?.close()}><X/></button><CuratedDemo/></dialog>
  </div>;
}
