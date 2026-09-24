import Link from "next/link";
import type { ReactNode } from "react";
export default function AppHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="walk-brand">
      <Link
        href="/"
        className="flex min-w-0 items-center gap-2.5"
        aria-label="CITYWALK"
      >
        <svg
          width="38"
          height="42"
          viewBox="0 0 48 48"
          fill="none"
          aria-hidden="true"
        >
          <g
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 38l8-2 11 3 11-3 12 2M3 44l8-2 11 3 11-3 12 2M8 36V17l5-4 4 4v20M22 37V7l3-3 3 5v28M34 36V19l4-5 4 5v18M25 4V1" />
          </g>
        </svg>
        <span className="text-lg font-semibold tracking-[.13em]">CITYWALK</span>
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
