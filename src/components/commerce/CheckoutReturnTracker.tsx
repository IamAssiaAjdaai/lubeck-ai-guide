"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useRef, useState } from "react";

import { getCityPassConfiguration } from "@/lib/commerce/cityPassConfig";
import {
  CITY_PASS_RETURN_STORAGE_KEY,
  parseCityPassReturnPath,
  type CityPassReturnIntent,
} from "@/lib/commerce/cityPassReturn";
import type { Locale } from "@/lib/i18n";

export function CheckoutReturnTracker({
  outcome,
  locale,
  activeCitySlugs,
  returnLabel,
}: Readonly<{
  outcome: "success" | "canceled";
  locale: Locale;
  activeCitySlugs: readonly string[];
  returnLabel: string;
}>) {
  const router = useRouter();
  const tracked = useRef(false);
  const [returnIntent, setReturnIntent] = useState<
    CityPassReturnIntent | null | undefined
  >();
  const destinationAccessActive = returnIntent
    ? activeCitySlugs.includes(returnIntent.citySlug)
    : false;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.sessionStorage.getItem(
          CITY_PASS_RETURN_STORAGE_KEY,
        );
        setReturnIntent(parseCityPassReturnPath(stored, locale) ?? null);
      } catch {
        setReturnIntent(null);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [locale]);

  useEffect(() => {
    if (returnIntent === undefined || tracked.current) return;
    tracked.current = true;
    const configuration = returnIntent
      ? getCityPassConfiguration(returnIntent.citySlug)
      : undefined;
    try {
      posthog.capture("checkout_returned", {
        locale,
        return_outcome: outcome,
        ...(configuration
          ? {
              city_slug: configuration.citySlug,
              product_slug: configuration.productSlug,
              pass_duration_hours: configuration.durationDays * 24,
            }
          : {}),
      });
    } catch {
      // Return-state rendering and entitlement polling remain functional.
    }
  }, [locale, outcome, returnIntent]);

  useEffect(() => {
    if (
      returnIntent === undefined ||
      outcome !== "success" ||
      destinationAccessActive
    ) {
      return;
    }
    let refreshes = 0;
    const timer = window.setInterval(() => {
      refreshes += 1;
      router.refresh();
      if (refreshes >= 5) window.clearInterval(timer);
    }, 2_000);
    return () => window.clearInterval(timer);
  }, [destinationAccessActive, outcome, returnIntent, router]);

  return returnIntent ? (
    <Link className="button-secondary mt-4 w-full" href={returnIntent.path}>
      {returnLabel}
    </Link>
  ) : null;
}
