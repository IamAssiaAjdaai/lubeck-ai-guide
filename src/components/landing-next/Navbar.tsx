"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CitywalkLogo } from "@/components/brand/CitywalkLogo";
import styles from "./landing-next.module.css";

const links = [
  ["#how", "How it works"], ["#features", "Features"],
  ["#cities", "Cities"], ["#faq", "FAQ"], ["/support", "Support"],
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpen(false); button.current?.focus(); }
    }
    function onPointer(event: PointerEvent) {
      if (event.target instanceof Node && !header.current?.contains(event.target)) setOpen(false);
    }
    const desktop = window.matchMedia("(min-width: 1025px)");
    function onResize() { if (desktop.matches) setOpen(false); }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    desktop.addEventListener("change", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      desktop.removeEventListener("change", onResize);
    };
  }, [open]);

  return (
    <header className={styles.nav} ref={header} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <Link className={styles.logo} href="#top" aria-label="CITYWALK home" onClick={() => setOpen(false)}>
        <CitywalkLogo className={styles.brand} />
      </Link>
      <nav aria-label="Primary">
        <ul className={styles.links}>
          {links.map(([href, label]) => <li key={href}>
            <Link href={href} prefetch={false}>{label}</Link>
          </li>)}
        </ul>
      </nav>
      <Link className={`${styles.btn} ${styles.btnPrimary}`} href="#download">Get the app</Link>
      <button className={styles.burger} type="button" ref={button} aria-expanded={open} aria-controls="landing-next-menu" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d={open ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16"} />
        </svg>
      </button>
      <nav aria-label="Mobile" className={`${styles.menu} ${open ? styles.open : ""}`} id="landing-next-menu" hidden={!open}>
        {[...links, ["#download", "Get the app"]].map(([href, label]) => <Link key={href} href={href} prefetch={false} onClick={() => setOpen(false)}>{label}</Link>)}
      </nav>
    </header>
  );
}
