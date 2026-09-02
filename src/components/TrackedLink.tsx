"use client";

import Link from "next/link";
import posthog from "posthog-js";
import type { ReactNode } from "react";

type TrackedLinkProps = {
  href: string;
  eventName: string;
  properties?: Record<string, string | number | boolean>;
  className?: string;
  children: ReactNode;
};

export default function TrackedLink({
  href,
  eventName,
  properties,
  className,
  children,
}: TrackedLinkProps) {
  const handleClick = () => {
    posthog.capture(eventName, properties);
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={className}
    >
      {children}
    </Link>
  );
}