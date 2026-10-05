import Link from "next/link";
import type { ReactNode } from "react";

import { CitywalkLogo } from "@/components/brand/CitywalkLogo";
export default function AppHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="walk-brand">
      <Link href="/" className="min-w-0" aria-label="CITYWALK">
        <CitywalkLogo
          className="flex min-w-0 items-center gap-2.5"
          markClassName="h-auto w-10 shrink-0 text-primary"
          wordmarkClassName="text-lg font-semibold tracking-[.13em]"
          aria-hidden="true"
        />
      </Link>
      {children ?? (
        <span className="brand-motto" lang="en">
          CITIES
          <br />
          STORIES
          <br />
          PEOPLE
          <br />
          EVERYWHERE
          <br />—
        </span>
      )}
    </header>
  );
}
