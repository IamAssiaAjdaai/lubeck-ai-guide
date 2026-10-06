"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";

import { getAnalyticsConsent } from "@/lib/analyticsConsent";
import { getVisitorJourneyEvent } from "@/lib/visitorJourney";
import {
  getBrowserVisitorSessionIdentity,
  getVisitorAnalyticsProperties,
} from "@/lib/visitorSession";

export default function VisitorJourneyTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/account/reset-password") return;
    const event = getVisitorJourneyEvent(pathname);
    if (!event || getAnalyticsConsent() !== "granted") return;

    try {
      if (posthog.has_opted_out_capturing()) return;
      const identity = getBrowserVisitorSessionIdentity();
      posthog.register(getVisitorAnalyticsProperties(identity));
      posthog.capture(event.eventName, event.properties);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("Visitor journey analytics could not be captured:", error);
      }
    }
  }, [pathname]);

  return null;
}
