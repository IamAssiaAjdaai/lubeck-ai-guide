"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import posthog from "posthog-js";
import { useEffect, useRef, useState } from "react";
import { resolveCityPassReturnPath } from "@/lib/commerce/cityPassReturn";
import type { Locale } from "@/lib/i18n";

export function CheckoutReturnTracker({
  outcome,
  locale,
  accessActive,
  returnLabel,
}: Readonly<{
  outcome: "success" | "canceled";
  locale: Locale;
  accessActive: boolean;
  returnLabel: string;
}>) {
  const router = useRouter();
  const tracked = useRef(false);
  const [returnPath, setReturnPath] = useState<string>();

  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true;
      try {
        posthog.capture("checkout_returned", {
          city_slug: "lubeck",
          locale,
          product_slug: "lubeck-digital-guide-pass-72h",
          return_outcome: outcome,
          pass_duration_hours: 72,
        });
      } catch {
        // Return-state rendering and entitlement polling remain functional.
      }
    }
    if (outcome !== "success" || accessActive) return;
    let refreshes = 0;
    const timer = window.setInterval(() => {
      refreshes += 1;
      router.refresh();
      if (refreshes >= 5) window.clearInterval(timer);
    }, 2_000);
    return () => window.clearInterval(timer);
  }, [accessActive, locale, outcome, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.sessionStorage.getItem("citywalk:city-pass:return");
        if (stored) setReturnPath(resolveCityPassReturnPath(stored, locale));
      } catch {
        // The purchases page remains usable without browser storage.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [locale]);

  return returnPath ? (
    <Link className="button-secondary mt-4 w-full" href={returnPath}>
      {returnLabel}
    </Link>
  ) : null;
}
