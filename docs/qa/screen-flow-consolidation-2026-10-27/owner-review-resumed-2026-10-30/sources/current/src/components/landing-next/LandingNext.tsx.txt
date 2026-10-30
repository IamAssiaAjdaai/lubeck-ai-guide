import type { CSSProperties } from "react";
import { CITYWALK_BRAND } from "@/lib/brand";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { Hero, HowItWorks, PersonalizedWalks, Features, Cities, WhyCitywalk, CityPass, Download, Faq } from "./sections";
import styles from "./landing-next.module.css";

export function LandingNext() {
  return (
    <div id="top" className={styles.page} style={{ "--brand-navy": CITYWALK_BRAND.colors.navy, "--brand-teal": CITYWALK_BRAND.colors.teal } as CSSProperties}>
      <a className={styles.skip} href="#main">Skip to content</a>
      <Navbar />
      <main id="main" tabIndex={-1}>
        <Hero />
        <HowItWorks />
        <PersonalizedWalks />
        <Features />
        <Cities />
        <WhyCitywalk />
        <CityPass />
        <Download />
        <Faq />
      </main>
      <Footer />
    </div>
  );
}
