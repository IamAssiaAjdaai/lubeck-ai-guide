import { CitywalkLogo, CitywalkMark } from "@/components/brand/CitywalkLogo";
import styles from "./landing.module.css";

const benefits = [
  { symbol: "pace", label: "At your own pace" },
  { symbol: "route", label: "Personal routes" },
  { symbol: "audio", label: "Stories & audio" },
  { symbol: "place", label: "Places to discover" },
] as const;

const steps = [
  {
    symbol: "time",
    title: "Tell us your time",
    body: "Choose how much time you have and when you’d like to be back.",
  },
  {
    symbol: "interests",
    title: "Pick your interests",
    body: "History, architecture, nature or hidden corners. Make it your walk.",
  },
  {
    symbol: "preview",
    title: "Preview your walk. Then go.",
    body: "See your route before you start, with stories and an estimated return time.",
  },
] as const;

type SymbolName = (typeof benefits)[number]["symbol"];
type StepSymbolName = (typeof steps)[number]["symbol"];

function BenefitIcon({ name }: { name: SymbolName }) {
  const paths = {
    pace: "M13 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-2 3 3 4 4 1M7 21l3-6 1-7-4 4H3m7 3 5 3v4",
    route: "M6 6h10a4 4 0 0 1 0 8H8a4 4 0 0 0 0 8h10M6 3v6M3 6h6m9 13 3 3-3 3",
    audio: "M4 14v-3a8 8 0 0 1 16 0v3M4 12h3v9H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2Zm16 0h-3v9h3a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2Z",
    place: "M12 22s8-8 8-13a8 8 0 0 0-16 0c0 5 8 13 8 13Zm0-10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  };
  return (
    <svg viewBox="0 0 26 28" width="26" height="28" fill="none" aria-hidden="true" focusable="false">
      <path d={paths[name]} stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StepIcon({ name }: { name: StepSymbolName }) {
  if (name === "time") {
    return (
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
        <circle cx="16" cy="16" r="10.5" stroke="currentColor" strokeWidth="2.2" />
        <path d="M16 9.5v7l4.5 2.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "interests") {
    return (
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
        <path d="M16 26S6 20.2 6 12.8C6 9.6 8.4 7 11.5 7c1.9 0 3.5 1 4.5 2.5C17 8 18.6 7 20.5 7 23.6 7 26 9.6 26 12.8 26 20.2 16 26 16 26Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
      <path d="m6.5 15.5 19-9-7.8 19-2.3-7.6-8.9-2.4Z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m15.5 17.5 4.8-4.8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function LandingHeader() {
  return (
    <header className={styles.header}>
      <a className={styles.brand} href="#the-app" aria-label="CITYWALK — back to introduction">
        <CitywalkLogo className={styles.brandLockup} markClassName={styles.brandMark} wordmarkClassName={styles.brandWordmark} />
      </a>
      <nav className={styles.navigation} aria-label="Landing page">
        <a href="#the-app">The app</a>
        <a href="#how-it-works">How it works</a>
        <a href="mailto:support@getcitywalk.com">Support</a>
      </nav>
      <a className={`${styles.primary} ${styles.headerAction}`} href="#launch-information">Launch information</a>
    </header>
  );
}

/** A deliberately labelled illustration, not a fabricated native screenshot. */
function PhoneIllustration() {
  return (
    <figure className={styles.phoneFigure}>
      <div className={styles.phone} aria-hidden="true">
        <div className={styles.phoneScreen}>
          <div className={styles.phoneTop}><span>9:41</span><span className={styles.phoneIsland} /><span>•••</span></div>
          <div className={styles.phoneBrand}><CitywalkMark /><strong>CITYWALK</strong></div>
          <div className={styles.phoneHeading}><span>Your walk</span><strong>A little more discovery.</strong></div>
          <svg className={styles.map} viewBox="0 0 280 270" fill="none" focusable="false">
            <rect width="280" height="270" fill="#f1f5ef" />
            <path d="M6 0C70 68 5 100 37 155s24 84 9 115" stroke="#c5e3f2" strokeWidth="38" />
            <path d="M84-10 280 99M65 92l214 124M112-10 41 280M256-5 142 280M81 195l191-71" stroke="white" strokeWidth="14" />
            <path d="m165 48 58 46-64 58 49 61-118 3 40-68-28-47 63-53Z" stroke="#2861e7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <g fill="#2861e7" stroke="white" strokeWidth="3">
              <circle cx="165" cy="48" r="9" /><circle cx="223" cy="94" r="9" />
              <circle cx="159" cy="152" r="9" /><circle cx="208" cy="213" r="9" />
            </g>
            <circle cx="90" cy="216" r="16" fill="#2861e7" opacity=".15" />
            <circle cx="90" cy="216" r="6" fill="#071c36" stroke="white" strokeWidth="3" />
          </svg>
          <div className={styles.phoneCard}>
            <span className={styles.phoneEyebrow}>NEXT STOP</span>
            <strong>A hidden courtyard</strong>
            <span>There’s a story around the corner.</span>
            <div className={styles.phoneStats}>
              <div><span>Return by</span><strong>17:30</strong></div>
              <div><span>Your walk</span><strong>4 places</strong></div>
            </div>
            <span className={styles.phoneAction}>Continue your walk <span>→</span></span>
          </div>
          <span className={styles.homeIndicator} />
        </div>
      </div>
      <figcaption>Illustrative preview · final app captures to follow.</figcaption>
    </figure>
  );
}

function ReturnByExample() {
  return (
    <figure className={styles.returnExample}>
      <div className={styles.returnCard}>
        <div className={styles.returnCardHeader}>
          <span className={styles.returnClock} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
              <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <div><span>Back by</span><strong>17:30</strong></div>
        </div>
        <dl className={styles.returnMetrics}>
          <div><dt>Projected finish</dt><dd>17:16</dd></div>
          <div><dt>Schedule estimate</dt><dd>14 min ahead</dd></div>
          <div><dt>Places remaining</dt><dd>3</dd></div>
        </dl>
      </div>
      <figcaption>Illustrative timing example · estimates update with the walk.</figcaption>
    </figure>
  );
}

export function LandingPreview() {
  return (
    <div className={styles.page} lang="en" dir="ltr">
      <a href="#landing-content" className={styles.skipLink}>Skip to content</a>
      <div className={styles.heroBackground}>
        <LandingHeader />
        <main id="landing-content" tabIndex={-1}>
          <section id="the-app" className={styles.hero} aria-labelledby="landing-title">
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>EXPLORE CITIES DIFFERENTLY</p>
              <h1 id="landing-title">A better way<br />to walk a city.</h1>
              <p className={styles.description}>
                Meet CITYWALK, your walking companion for <strong>iPhone and Android.</strong> Build a personal route around your time and interests, with local stories, audio and an estimated return time.
              </p>
              <p className={styles.availability}>Launching first in Lübeck. More cities to follow.</p>
              <div className={styles.actions}>
                <a className={styles.primary} href="#launch-information">Launch information <span aria-hidden="true">↗</span></a>
                <a className={styles.secondary} href="#how-it-works">See how it works <span aria-hidden="true">↓</span></a>
              </div>
              <ul className={styles.benefits} aria-label="What CITYWALK offers">
                {benefits.map(({ symbol, label }) => <li key={symbol}><BenefitIcon name={symbol} /><span>{label}</span></li>)}
              </ul>
            </div>
            <div className={styles.heroVisual}>
              <p className={styles.visualNote} aria-hidden="true">Your time.<br />Your way.</p>
              <PhoneIllustration />
            </div>
          </section>

          <section id="how-it-works" className={styles.howItWorks} aria-labelledby="how-title">
            <p className={styles.eyebrow}>HOW IT WORKS</p>
            <h2 id="how-title">Your time. Your interests. Your walk.</h2>
            <ol className={styles.steps}>
              {steps.map(({ symbol, title, body }, index) => (
                <li key={title}>
                  <div className={styles.stepTop}>
                    <span className={styles.stepNumber} aria-hidden="true">{index + 1}</span>
                    <span className={styles.stepIcon}><StepIcon name={symbol} /></span>
                  </div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </li>
              ))}
            </ol>
          </section>

          <section id="return-by" className={styles.returnBy} aria-labelledby="return-title">
            <div className={styles.returnCopy}>
              <p className={styles.eyebrow}>RETURN-BY PLANNING</p>
              <h2 id="return-title">A walk that fits your day.</h2>
              <p className={styles.returnLead}>
                Choose when you’d like to be back. CITYWALK uses that target when planning and keeps your projected finish visible while you walk.
              </p>
              <ul className={styles.returnPoints}>
                <li><span aria-hidden="true">✓</span>Set a back-by time before you start.</li>
                <li><span aria-hidden="true">✓</span>See remaining time and your projected finish.</li>
                <li><span aria-hidden="true">✓</span>See whether the current estimate is ahead, on schedule or behind.</li>
              </ul>
              <ReturnByExample />
              <p className={styles.returnDisclaimer}>Walking times are estimates, not a guaranteed arrival time.</p>
            </div>
            <div className={styles.returnPhoto} role="img" aria-label="Lübeck Holstentor">
              <p aria-hidden="true">Make time<br />for the city.</p>
            </div>
          </section>

          <section id="launch-information" className={styles.launchInfo} aria-labelledby="launch-title">
            <div><p className={styles.eyebrow}>COMING TO IPHONE & ANDROID</p><h2 id="launch-title">Your next walk is waiting.</h2><p>We’re preparing CITYWALK for launch. Store links and launch notifications will be added when they’re ready.</p></div>
            <a className={styles.contact} href="mailto:support@getcitywalk.com">Contact CITYWALK <span aria-hidden="true">↗</span></a>
          </section>
        </main>
      </div>
      <footer className={styles.previewNote}>
        <span>Design preview · How it works + Return-by checkpoint</span>
        <span>Not a live download or email signup page.</span>
      </footer>
    </div>
  );
}
