import posthog from "posthog-js";

import { getAnalyticsConsent, subscribeAnalyticsConsent } from "./src/lib/analyticsConsent";
import {
  getBrowserVisitorSessionIdentity,
  clearBrowserVisitorSessionIdentity,
  getVisitorAnalyticsProperties,
} from "./src/lib/visitorSession";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
let initialized = false;

function synchronizeAnalyticsConsent() {
  if (getAnalyticsConsent() !== "granted") {
    if (initialized) {
      try { posthog.opt_out_capturing(); } catch { /* Capture-time guard remains closed. */ }
      try { posthog.stopExceptionAutocapture(); } catch { /* SDK may not be ready. */ }
    }
    clearBrowserVisitorSessionIdentity();
    return;
  }

  // No initialization without consent, configuration and a nonsensitive route.
  if (
    getAnalyticsConsent() === "granted" && projectToken && apiHost &&
    window.location.pathname !== "/account/reset-password"
  ) {
    try {
      if (!initialized) {
        posthog.init(projectToken, {
          api_host: apiHost,
          defaults: "2026-01-30",
          autocapture: false,
          capture_pageview: false,
          capture_pageleave: false,
          capture_exceptions: true,
          disable_session_recording: true,
          persistence: "localStorage",
          request_batching: false,
          respect_dnt: true,
          // Applies to every capture producer, including SDK exception capture.
          before_send: (event) => getAnalyticsConsent() === "granted" ? event : null,
          debug: process.env.NODE_ENV === "development",
        });
        initialized = true;
      }
      if (posthog.has_opted_out_capturing()) posthog.opt_in_capturing({ captureEventName: false });
      posthog.startExceptionAutocapture();
      posthog.register(getVisitorAnalyticsProperties(getBrowserVisitorSessionIdentity()));
    } catch {
      // Analytics availability must never prevent use of CITYWALK.
    }
  }
}

// UI, other tabs and restored documents share the same capture-time gate.
subscribeAnalyticsConsent(synchronizeAnalyticsConsent);
synchronizeAnalyticsConsent();
