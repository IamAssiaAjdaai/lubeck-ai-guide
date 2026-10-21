import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";

import { CitywalkLogo } from "@/components/brand/CitywalkLogo";
import { CITYWALK_BRAND } from "@/lib/brand";

import styles from "./public-info.module.css";

export function PublicInfoLayout({ children }: { children: ReactNode }) {
  const colors = {
    "--info-navy": CITYWALK_BRAND.colors.navy,
    "--info-teal": CITYWALK_BRAND.colors.teal,
    "--info-canvas": CITYWALK_BRAND.colors.canvas,
    "--info-white": CITYWALK_BRAND.colors.white,
  } as CSSProperties;

  return (
    <div className={styles.page} style={colors}>
      <a href="#public-info-content" className={styles.skip}>Skip to content</a>
      <header className={styles.header}>
        <div className={styles.bar}>
          <Link href="/" aria-label="CITYWALK home" className={styles.logo}>
            <CitywalkLogo className={styles.lockup} markClassName={styles.mark} />
          </Link>
          <nav className={styles.nav} aria-label="Legal navigation">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/imprint">Imprint</Link>
            <Link href="/support">Support</Link>
            <Link href="/account-deletion">Account deletion</Link>
          </nav>
        </div>
      </header>
      <main id="public-info-content" tabIndex={-1} className={styles.content}>
        {children}
      </main>
      <footer className={styles.footer}>
        <div className={styles.bar}>
          <span>© 2026 CITYWALK</span>
          <Link href="/">Back to CITYWALK</Link>
        </div>
      </footer>
    </div>
  );
}
