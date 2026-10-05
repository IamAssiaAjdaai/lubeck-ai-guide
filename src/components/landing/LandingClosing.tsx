import { CitywalkLogo, CitywalkMark } from "@/components/brand/CitywalkLogo";
import styles from "./closing.module.css";

const questions = [
  {
    id: "pricing",
    question: "Is CITYWALK free?",
    answer: "Launch pricing is still being finalized. Pricing and any paid features will be explained before release.",
  },
  {
    id: "account",
    question: "Do I need an account?",
    answer: "You can explore and plan a walk without signing in. Saving a walk to your CITYWALK account requires sign-in.",
  },
  {
    id: "cities",
    question: "Which cities are coming?",
    answer: "Lübeck is our first city. The Cities section shows the currently planned additions. City rollout and app-store release are announced separately.",
  },
  {
    id: "offline",
    question: "Does it work offline?",
    answer: "Plan to have an internet connection when loading city content, audio or Ask CITYWALK. A fully offline experience is not promised for launch.",
  },
] as const;

/** Prelaunch information only: no subscriber collection or pretend store links. */
export function LandingLaunchSection() {
  return (
    <section id="launch-information" className={styles.launch} aria-labelledby="launch-title">
      <div className={styles.launchCopy}>
        <p className={styles.eyebrow}>YOUR NEXT CITY WALK</p>
        <h2 id="launch-title">Your next walk is waiting.</h2>
        <p className={styles.launchLead}>We’re preparing CITYWALK for iPhone and Android. Starting in Lübeck, with more cities to follow.</p>
        <ul className={styles.platforms} aria-label="Planned app platforms">
          <li>iPhone <span>Planned</span></li>
          <li>Android <span>Planned</span></li>
        </ul>
        <div className={styles.launchActions}>
          <a className={styles.launchPrimary} href="mailto:support@getcitywalk.com">Contact CITYWALK <span aria-hidden="true">↗</span></a>
          <a className={styles.launchSecondary} href="#faq">Read the FAQ <span aria-hidden="true">↓</span></a>
        </div>
        <p className={styles.launchNote}>Store links and launch notifications will be added when they’re ready. Contacting support does not subscribe you to launch emails.</p>
      </div>
      <div className={styles.launchArt} aria-hidden="true">
        <div className={styles.brandTile}><CitywalkMark /></div>
        <strong>CITYWALK</strong>
        <span>Walk the city your way.</span>
      </div>
    </section>
  );
}

/** Native disclosure elements keep the FAQ usable without client JavaScript. */
export function LandingFaq() {
  return (
    <section id="faq" className={styles.faq} aria-labelledby="faq-title">
      <p className={styles.eyebrow}>FAQ</p>
      <h2 id="faq-title">Quick answers.</h2>
      <div className={styles.faqGrid}>
        {questions.map(({ id, question, answer }) => (
          <details key={id} id={`faq-${id}`} className={styles.faqItem}>
            <summary>
              <span>{question}</span>
              <svg className={styles.disclosure} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path d="M3 8h10" />
                <path className={styles.vertical} d="M8 3v10" />
              </svg>
            </summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

const pendingPages = ["Privacy", "Terms", "Imprint", "Account deletion"] as const;

export function LandingFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerGrid}>
        <div className={styles.footerBrand}>
          <a href="#the-app" className={styles.brandLink} aria-label="CITYWALK — back to introduction">
            <CitywalkLogo className={styles.brandLockup} markClassName={styles.brandMark} wordmarkClassName={styles.wordmark} />
          </a>
          <p>Walk the city your way.</p>
        </div>
        <nav className={styles.footerNav} aria-label="Footer navigation">
          <a href="#the-app">The app</a>
          <a href="#how-it-works">How it works</a>
          <a href="#cities">Cities</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className={styles.support}>
          <p className={styles.footerHeading}>Need a hand?</p>
          <a href="mailto:support@getcitywalk.com">support@getcitywalk.com</a>
        </div>
      </div>
      <div className={styles.legalPending}>
        <p className={styles.footerHeading}>Legal pages · in preparation</p>
        <ul aria-label="Legal pages in preparation">
          {pendingPages.map((label) => <li key={label}>{label}</li>)}
        </ul>
        <p>Links will be added after review. These labels are not published policies or an account-deletion service.</p>
      </div>
      <div className={styles.footerBottom}>
        <span>© 2026 CITYWALK</span>
        <span>Design preview · not a live download or email signup page.</span>
      </div>
    </footer>
  );
}
