import Link from "next/link";
import { CitywalkLogo, CitywalkMark } from "@/components/brand/CitywalkLogo";
import { CITYWALK_SUPPORT_EMAIL } from "@/lib/legal";
import styles from "./coming-soon.module.css";

export function ComingSoon() {
  return (
    <div className={styles.page}>
      <a className={styles.skip} href="#main">Skip to content</a>
      <header className={styles.header}>
        <Link prefetch={false} href="/" aria-label="CITYWALK home">
          <CitywalkLogo className={styles.logo} markClassName={styles.mark} wordmarkClassName={styles.wordmark} />
        </Link>
        <Link prefetch={false} href="/support">Get in touch <span aria-hidden="true">↗</span></Link>
      </header>
      <main id="main" tabIndex={-1} className={styles.main}>
        <section className={styles.hero} aria-labelledby="intro">
          <div className={styles.copy}>
            <p className={styles.eyebrow}>A new way to discover · Coming soon</p>
            <h1 id="intro">Good cities.<br />Great walks.<br /><span>Your pace.</span></h1>
            <p className={styles.intro}>Step into the stories around you. CITYWALK is coming to iOS and Android — starting in Lübeck.</p>
            <div className={styles.platforms} aria-label="Planned platforms"><span>iOS</span><span>Android</span></div>
            <p className={styles.date}>Planned launch <time dateTime="2026-11-16">16 November 2026</time></p>
            <p className={styles.note}>Subject to store approval and release readiness. Verified download links will appear here when the apps are available.</p>
          </div>
          <div className={styles.art} aria-hidden="true">
            <div className={styles.orbit} />
            <CitywalkMark className={styles.heroMark} />
            <span className={styles.city}>54° N · 10° E<br /><strong>Lübeck first.</strong></span>
          </div>
        </section>
        <section className={styles.details} aria-label="About the launch">
          <div><p className={styles.eyebrow}>01 / The beginning</p><h2>A city worth slowing down for.</h2><p>Our first chapter begins in Lübeck. Familiar streets, unexpected corners and a little more curiosity.</p></div>
          <div><p className={styles.eyebrow}>02 / Made for your pocket</p><h2>Discover on the go.</h2><p>Designed for iPhone and Android. This website does not sell passes or subscriptions. Paid products will be available only through in-app purchases, when approved.</p></div>
        </section>
      </main>
      <footer className={styles.footer}>
        <div><strong>CITYWALK</strong><a href={`mailto:${CITYWALK_SUPPORT_EMAIL}`}>{CITYWALK_SUPPORT_EMAIL}</a></div>
        <nav aria-label="Legal and support"><Link prefetch={false} href="/privacy">Privacy</Link><Link prefetch={false} href="/terms">Terms</Link><Link prefetch={false} href="/imprint">Imprint</Link><Link prefetch={false} href="/support">Support</Link><Link prefetch={false} href="/account-deletion">Account deletion</Link></nav>
      </footer>
    </div>
  );
}
