"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import posthog from "posthog-js";

import {
  marketingAttributionPostHogProperties,
  type MarketingAttribution,
} from "@/lib/marketingAttribution";

type MarketingLandingTrackerProps = Readonly<{
  city: string;
  landingVariant: string;
  campaignSlug?: string;
  attribution: MarketingAttribution;
  ctaHref?: string;
  ctaLabel?: string;
}>;

export default function MarketingLandingTracker({
  city,
  landingVariant,
  campaignSlug,
  attribution,
  ctaHref,
  ctaLabel,
}: MarketingLandingTrackerProps) {
  const trackedView = useRef(false);
  const properties = getLandingProperties({
    city,
    landingVariant,
    campaignSlug,
    attribution,
  });

  useEffect(() => {
    if (trackedView.current) return;
    trackedView.current = true;
    captureMarketingEvent("landing_view", properties);
  }, [properties]);

  if (!ctaHref || !ctaLabel) return null;

  return (
    <Link
      href={ctaHref}
      className="button-primary inline-flex min-h-12 items-center justify-center px-6"
      onClick={() => captureMarketingEvent("build_walk_clicked", properties)}
    >
      {ctaLabel}
    </Link>
  );
}

function getLandingProperties({
  city,
  landingVariant,
  campaignSlug,
  attribution,
}: Readonly<{
  city: string;
  landingVariant: string;
  campaignSlug?: string;
  attribution: MarketingAttribution;
}>) {
  const effectiveAttribution: MarketingAttribution = {
    ...attribution,
    source: attribution.source ?? "direct",
    campaign: attribution.campaign ?? campaignSlug,
  };

  return {
    city,
    landing_variant: landingVariant,
    ...marketingAttributionPostHogProperties(effectiveAttribution),
  };
}

function captureMarketingEvent(
  eventName: "landing_view" | "build_walk_clicked",
  properties: Readonly<Record<string, string>>,
) {
  try {
    if (posthog.has_opted_out_capturing()) return;
    posthog.capture(eventName, properties);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Marketing analytics could not be captured:", error);
    }
  }
}
