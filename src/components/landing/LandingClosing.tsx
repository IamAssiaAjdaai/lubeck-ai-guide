import Link from "next/link";

import { CitywalkLogo, CitywalkMark } from "@/components/brand/CitywalkLogo";
import styles from "./closing.module.css";

const questions = [
  {
    id: "pricing",
    question: "Is CITYWALK free?",
    answer: "Yes. CITYWALK has a free experience. For Lübeck, a 72-hour City Pass is planned at €4.99. CITYWALK Premium is planned at €7.99 per month or €39.99 per year. Store prices may be localized by country.",
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

const socialChannels = [
  { name: "Instagram", handle: "@getcitywalk", icon: "instagram" },
  { name: "YouTube", handle: "@getcitywalk", icon: "youtube" },
] as const;

function SocialIcon({ name }: { name: (typeof socialChannels)[number]["icon"] }) {
  if (name === "youtube") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect x="3.2" y="6.2" width="17.6" height="11.6" rx="3.2" />
        <path d="m10.2 9.4 5 2.6-5 2.6V9.4Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="4" y="4" width="16" height="16" rx="4.5" />
      <circle cx="12" cy="12" r="3.6" />
      <circle cx="17.3" cy="6.8" r=".9" className={styles.socialDot} />
    </svg>
  );
}

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

const pendingPages = ["Privacy", "Terms", "Imprint"] as const;

export function LandingFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerGrid}>
        <div className={styles.footerBrand}>
          <a href="#the-app" className={styles.brandLink} aria-label="CITYWALK — back to introduction">
            <CitywalkLogo className={styles.brandLockup} markClassName={styles.brandMark} wordmarkClassName={styles.wordmark} />
          </a>
          <p>Walk the city your way.</p>
          <div className={styles.socialBlock} aria-label="CITYWALK social media">
            <p className={styles.footerHeading}>Follow CITYWALK</p>
            <div className={styles.socialRow}>
              {socialChannels.map(({ name, handle, icon }) => (
                <span className={styles.socialChip} key={name} title={`${name} · coming soon`}>
                  <span className={styles.socialIcon}><SocialIcon name={icon} /></span>
                  <span className={styles.socialLabel}><strong>{name}</strong><small>{handle}</small></span>
                  <span className={styles.socialSoon}>Soon</span>
                </span>
              ))}
            </div>
          </div>
        </div>
        <nav className={styles.footerNav} aria-label="Footer navigation">
          <a href="#the-app">The app</a>
          <a href="#how-it-works">How it works</a>
          <a href="#cities">Cities</a>
          <a href="#faq">FAQ</a>
          <Link href="/account-deletion">Account deletion</Link>
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
        <p>Privacy, Terms and Imprint links will be added after review. Account deletion is available separately from the footer navigation.</p>
      </div>
      <div className={styles.footerBottom}>
        <span>© 2026 CITYWALK</span>
        <span>Design preview · not a live download or email signup page.</span>
      </div>
    </footer>
  );
}
