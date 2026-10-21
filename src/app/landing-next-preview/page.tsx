import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Bike, BookOpen, Clock3, Compass, Headphones, MapPin, Route, Sparkles } from "lucide-react";

import { CitywalkLogo, CitywalkMark } from "@/components/brand/CitywalkLogo";
import { cityLaunches } from "@/data/cityAvailability";
import { getApprovedStoreLinks } from "./storeLinks";
import styles from "./landing-next.module.css";

/**
 * Isolated founder-review concept. Do NOT mount on / or ship from the #395 RC.
 * No app-store links, subscriptions, external imagery or invented social proof.
 */
export const metadata: Metadata = {
  title: "CITYWALK — Planta-inspired landing concept (private review)",
  description: "Unpublished design concept for CITYWALK. Not an app-store launch announcement.",
  robots: { index: false, follow: false },
};

const steps = [
  { n: "01", icon: Clock3, title: "Tell us your time", body: "Have an hour or an afternoon? Choose your walking time and when you want to return." },
  { n: "02", icon: Compass, title: "Make it your own", body: "Choose what interests you, from historic streets to quiet corners." },
  { n: "03", icon: Route, title: "Walk your way", body: "See your route and discover the stories waiting along the way." },
] as const;

const features = [
  { icon: Route, title: "A walk that fits", body: "Routes shaped around the time and interests you choose." },
  { icon: BookOpen, title: "Stories worth stopping for", body: "Learn more about the places you actually visit." },
  { icon: Headphones, title: "Listen as you explore", body: "Audio stories where they are available in your selected language." },
  { icon: Sparkles, title: "Ask CITYWALK", body: "Get place-specific guidance where the AI Guide is available and your access allows it." },
] as const;

const faq = [
  { question: "Can I explore without paying?", answer: "CITYWALK includes a free discovery experience. Any paid City Pass features will be shown clearly in the native app when available." },
  { question: "Is CITYWALK available on iPhone and Android?", answer: "Genuine App Store and Google Play buttons appear only when their listings are published and approved. Platform availability can vary by country." },
  { question: "Which city comes first?", answer: "Lübeck is our first city. Other destinations will be announced separately as their content and apps become ready." },
  { question: "Can I use audio and the AI Guide everywhere?", answer: "Not everywhere. Story, audio and Guide availability depends on the place, published content, your selected language and eligibility." },
  { question: "Will a route always finish on time?", answer: "CITYWALK can estimate your return time; walking and arrival estimates are not guarantees. Check local conditions and signs." },
] as const;

const cities = Object.entries(cityLaunches).filter(([, city]) => city.status !== "unpublished");

function IllustrativePhone() {
  return (
    <figure className={styles.phoneFigure}>
      <div className={styles.phone} aria-hidden="true">
        <div className={styles.phoneGlass}>
          <div className={styles.phoneTop}><span>9:41</span><span className={styles.phonePill} /><span>•••</span></div>
          <div className={styles.phoneBrand}><CitywalkMark /><span>CITYWALK</span></div>
          <div className={styles.phoneWelcome}>Your city, your way.</div>
          <div className={styles.phoneMap}>
            <svg viewBox="0 0 280 290" role="presentation" focusable="false">
              <rect width="280" height="290" fill="#e5eee7" />
              <path d="M-10 65 296 135M48 -18 210 304M272 -8 35 303M-10 220 290 56M1 158 282 268" stroke="#fff" strokeWidth="14" />
              <path d="M-15 37C75 85 32 140 100 172s48 95 148 135" fill="none" stroke="#a4d5df" strokeWidth="32" />
              <path d="M61 222 100 172 161 190 210 99" fill="none" stroke="#2c5bd8" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 0" strokeWidth="5" />
              <g fill="#2c5bd8" stroke="#fff" strokeWidth="4"><circle cx="61" cy="222" r="10" /><circle cx="100" cy="172" r="10" /><circle cx="161" cy="190" r="10" /><circle cx="210" cy="99" r="10" /></g>
            </svg>
          </div>
          <div className={styles.phoneTrip}>
            <span className={styles.phoneTripLabel}>YOUR NEXT STOP</span>
            <strong>A story around the corner</strong>
            <div><span>4 stops</span><span>Back by 17:30</span></div>
            <span className={styles.phoneTripButton}>Continue exploring <ArrowRight size={14} /></span>
          </div>
        </div>
      </div>
      <figcaption>Illustrative concept · not a real app screenshot</figcaption>
    </figure>
  );
}

export default function LandingNextPreviewPage() {
  const storeLinks = getApprovedStoreLinks();
  return (
    <div className={styles.page} id="top">
      <a className={styles.skip} href="#content">Skip to content</a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <a className={styles.brand} href="#top" aria-label="CITYWALK — back to top"><CitywalkLogo /></a>
          <nav className={styles.headerNav} aria-label="Main navigation">
            <a href="#how-it-works">How it works</a>
            <a href="#features">The app</a>
            <a href="#cities">Cities</a>
            <Link href="/support">Support</Link>
          </nav>
          <div className={styles.headerActions}>
            <Link className={styles.headerSignIn} href="/explore">Explore</Link>
            <a className={styles.headerCta} href="#download">Get the app <ArrowUpRight size={18} /></a>
          </div>
          <details className={styles.mobileMenu}>
            <summary aria-label="Open navigation menu">Menu <span aria-hidden="true">☰</span></summary>
            <nav aria-label="Mobile navigation">
              <a href="#how-it-works">How it works</a>
              <a href="#features">The app</a>
              <a href="#cities">Cities</a>
              <a href="#faq">FAQ</a>
              <Link href="/support">Support</Link>
              <Link href="/explore">Explore</Link>
            </nav>
          </details>
        </div>
      </header>

      <main id="content">
        <section className={styles.hero} aria-labelledby="main-title">
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}><span className={styles.eyebrowDot} /> DISCOVER CITIES DIFFERENTLY</p>
              <h1 id="main-title">Make every city<br /><em>your own.</em></h1>
              <p className={styles.heroLead}>
                Discover remarkable places at your pace. CITYWALK helps you find a personal route, explore local stories and make the most of your time.
              </p>
              <div className={styles.heroActions}>
                <Link className={styles.primary} href="/explore">Start exploring <ArrowUpRight size={19} /></Link>
                <a className={styles.outline} href="#download">Get the app <ArrowRight size={18} /></a>
              </div>
              <p className={styles.launchPill}><MapPin size={16} /> Lübeck first · {storeLinks.ios || storeLinks.android ? "Official store listings available where published" : "Native iPhone & Android app coming soon"}</p>
              <div className={styles.heroBenefits} aria-label="CITYWALK benefits">
                <span><Clock3 size={19} /> At your pace</span>
                <span><Route size={19} /> Personal routes</span>
                <span><Headphones size={19} /> Stories & audio</span>
              </div>
            </div>
            <div className={styles.heroVisual}>
              <div className={styles.photoBackdrop} aria-hidden="true" />
              <div className={styles.heroBadge}><MapPin size={18} strokeWidth={2} /><span>Starting in <strong>Lübeck</strong></span></div>
              <IllustrativePhone />
            </div>
          </div>
        </section>

        <section className={styles.introBand} aria-label="CITYWALK promise">
          <div className={styles.contentWrap}><span>MORE THAN A ROUTE</span><p>The best way to discover a place is to make it <em>your own.</em></p></div>
        </section>

        <section id="how-it-works" className={styles.section} aria-labelledby="how-title">
          <div className={styles.contentWrap}>
            <p className={styles.kicker}>SIMPLE FROM THE FIRST STEP</p>
            <div className={styles.sectionHeading}><h2 id="how-title">A great walk starts <em>with you.</em></h2><p>Less planning, more discovering. Three small choices are all you need to get started.</p></div>
            <ol className={styles.stepGrid}>
              {steps.map(({ n, icon: Icon, title, body }) => (
                <li key={n} className={styles.stepCard}><div className={styles.stepHead}><span>{n}</span><Icon size={29} strokeWidth={1.7} /></div><h3>{title}</h3><p>{body}</p></li>
              ))}
            </ol>
          </div>
        </section>

        <section id="features" className={styles.features} aria-labelledby="features-title">
          <div className={styles.contentWrap}>
            <div className={styles.sectionHeading}><div><p className={styles.kicker}>THE LITTLE DETAILS</p><h2 id="features-title">Every street has <em>a story.</em></h2></div><p>Explore with practical tools and a little curiosity. Feature availability can vary by place and language.</p></div>
            <div className={styles.featureLayout}>
              <div className={styles.featurePhoto}><div><span>DISCOVER LÜBECK</span><strong>Go beyond<br />the postcard.</strong></div></div>
              <div className={styles.featureGrid}>
                {features.map(({ icon: Icon, title, body }) => (
                  <article className={styles.featureCard} key={title}><div className={styles.featureIcon}><Icon size={25} strokeWidth={1.7} /></div><h3>{title}</h3><p>{body}</p></article>
                ))}
              </div>
            </div>
            <p className={styles.featureNote}><Bike size={17} /> Walking and bike-friendly experiences depend on verified route availability and local conditions.</p>
          </div>
        </section>

        <section id="cities" className={styles.section} aria-labelledby="cities-title">
          <div className={styles.contentWrap}>
            <p className={styles.kicker}>PLACES TO FALL FOR</p>
            <div className={styles.sectionHeading}><h2 id="cities-title">One city to start.<br /><em>So much to discover.</em></h2><p>We begin in Lübeck, with more destinations planned. City content readiness is separate from app-store availability.</p></div>
            <div className={styles.cityGrid}>
              {cities.map(([slug, city]) => (
                <article key={slug} className={styles.cityCard}>
                  <div className={styles.cityPhoto} role="img" aria-label={city.name} style={city.heroImage ? { backgroundImage: "url(" + JSON.stringify(city.heroImage) + ")" } : undefined} />
                  <div className={styles.cityMeta}><div><h3>{city.name}</h3><p>{city.status === "available" ? "First CITYWALK city" : "Planned destination"}</p></div><span>{city.status === "available" ? "First city" : "Coming soon"}</span></div>
                  {city.credit ? <small className={styles.cityCredit}>Image: {city.credit.text}</small> : null}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="download" className={styles.download} aria-labelledby="download-title">
          <div className={styles.downloadInner}>
            <div><p className={styles.kicker}>YOUR NEXT CITY WALK</p><h2 id="download-title">Adventure is<br /><em>closer than you think.</em></h2><p>{storeLinks.ios || storeLinks.android ? "Download CITYWALK from the verified store listings below. Availability may vary by country and device." : "CITYWALK is being prepared for iPhone and Android. Verified app-store links will appear here only when the listings are live."}</p>
              <div className={styles.platforms}>
                {storeLinks.ios ? <a href={storeLinks.ios} target="_blank" rel="noopener noreferrer">App Store — iPhone <ArrowUpRight size={14} /></a> : <span>iPhone · In preparation</span>}
                {storeLinks.android ? <a href={storeLinks.android} target="_blank" rel="noopener noreferrer">Google Play — Android <ArrowUpRight size={14} /></a> : <span>Android · In preparation</span>}
              </div>
              <div className={styles.downloadActions}><Link className={styles.primary} href="/explore">Explore the city <ArrowUpRight size={18} /></Link><Link className={styles.outline} href="/support">Get in touch <ArrowRight size={17} /></Link></div>
            </div>
            <div className={styles.downloadArt} aria-hidden="true"><CitywalkMark /><strong>CITYWALK</strong><span>Walk the city your way.</span></div>
          </div>
        </section>

        <section id="faq" className={styles.section} aria-labelledby="faq-title">
          <div className={styles.faqWrap}><p className={styles.kicker}>GOOD TO KNOW</p><h2 id="faq-title">Questions?<br /><em>We get it.</em></h2><div className={styles.faqList}>{faq.map(({ question, answer }) => (
            <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>
          ))}</div></div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerTop}><a className={styles.footerBrand} href="#top" aria-label="CITYWALK, back to top"><CitywalkLogo /></a><p>More to see. Your way to get there.</p><Link href="/support">Need help? Contact support <ArrowUpRight size={15} /></Link></div>
        <nav aria-label="Footer navigation" className={styles.footerLinks}>
          <a href="#how-it-works">How it works</a><a href="#features">Features</a><a href="#cities">Cities</a><a href="#faq">FAQ</a>
          <Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/imprint">Imprint</Link><Link href="/support">Support</Link><Link href="/account-deletion">Account deletion</Link>
        </nav>
        <div className={styles.footerBottom}><span>© 2026 CITYWALK</span><span>Concept preview · not a public launch announcement</span></div>
      </footer>
    </div>
  );
}
