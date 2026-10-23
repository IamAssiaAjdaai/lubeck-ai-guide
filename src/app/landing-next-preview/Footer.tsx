import Link from "next/link";
import { CitywalkLogo } from "@/components/brand/CitywalkLogo";
import styles from "./landing-next.module.css";
export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.fg}>
        <div>
          <Link href="#top" className={styles.logo} aria-label="CITYWALK home">
            <CitywalkLogo className={styles.brand} />
          </Link>
          <p className={styles.footerLead}>Make every city your own. Personal walks and local stories, starting in Lübeck.</p>
        </div>
        <div>
          <h2>Explore</h2>
          <ul>
            <li>
              <a href="#how">How it works</a>
            </li>
            <li>
              <a href="#features">Features</a>
            </li>
            <li>
              <a href="#cities">Cities</a>
            </li>
            <li>
              <a href="#faq">FAQ</a>
            </li>
          </ul>
        </div>
        <div>
          <h2>Help</h2>
          <ul>
            <li>
              <Link href="/support" prefetch={false}>Support</Link>
            </li>
            <li>
              <Link href="/support" prefetch={false}>Contact</Link>
            </li>
            <li>
              <Link href="/account-deletion" prefetch={false}>Account deletion</Link>
            </li>
          </ul>
        </div>
        <div>
          <h2>Legal</h2>
          <ul>
            <li>
              <Link href="/privacy" prefetch={false}>Privacy</Link>
            </li>
            <li>
              <Link href="/terms" prefetch={false}>Terms</Link>
            </li>
            <li>
              <Link href="/imprint" prefetch={false}>Imprint</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className={styles.copy}>© 2026 CITYWALK. All rights reserved.</div>
    </footer>
  );
}
