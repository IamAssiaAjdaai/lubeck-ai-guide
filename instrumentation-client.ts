import posthog from "posthog-js";

import {
  getBrowserVisitorSessionIdentity,
  getVisitorAnalyticsProperties,
} from "./src/lib/visitorSession";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

// Analytics is optional; missing configuration must never block hydration.
if (projectToken && apiHost) {
  posthog.init(projectToken, {
    api_host: apiHost,
    defaults: "2026-01-30",
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
  });

  try {
    if (!posthog.has_opted_out_capturing()) {
      posthog.register(
        getVisitorAnalyticsProperties(getBrowserVisitorSessionIdentity()),
      );
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Anonymous visitor analytics could not be initialized:", error);
    }
  }
}
