"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import posthog from "posthog-js";

import {
  getAnalyticsConsent,
  setAnalyticsConsent,
  type AnalyticsConsent,
} from "@/lib/analyticsConsent";
import { clearBrowserVisitorSessionIdentity } from "@/lib/visitorSession";

function browserAnalyticsConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
    process.env.NEXT_PUBLIC_POSTHOG_HOST
  );
}

function applyDecision(decision: Exclude<AnalyticsConsent, "unset">) {
  setAnalyticsConsent(decision);
  if (decision === "denied") {
    clearBrowserVisitorSessionIdentity();
    try {
      posthog.opt_out_capturing();
    } catch {
      // The SDK may never have initialized; first-party consent still gates it.
    }
  }
  window.location.reload();
}

const subscribeConsentSnapshot = () => () => {};

function useDecision() {
  const ready = useSyncExternalStore(
    subscribeConsentSnapshot,
    () => true,
    () => false,
  );
  const decision = useSyncExternalStore(
    subscribeConsentSnapshot,
    getAnalyticsConsent,
    () => "unset",
  );
  return { decision, ready };
}

export function AnalyticsConsentBanner() {
  const pathname = usePathname();
  const { decision, ready } = useDecision();
  if (
    !ready ||
    !browserAnalyticsConfigured() ||
    decision !== "unset" ||
    pathname === "/account/reset-password"
  ) {
    return null;
  }

  return (
    <aside
      aria-label="Analytics preferences"
      className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
    >
      <h2 className="text-base font-bold text-slate-950">Analytics choice</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        CITYWALK can use optional PostHog analytics to understand which product
        and Marketing features are useful. Analytics stays off until you allow it.
        You can change this choice later on the Privacy page.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => applyDecision("granted")}
          className="min-h-11 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Allow analytics
        </button>
        <button
          type="button"
          onClick={() => applyDecision("denied")}
          className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900"
        >
          Decline
        </button>
        <Link
          href="/privacy"
          className="min-h-11 content-center px-2 text-sm font-medium text-blue-700 underline underline-offset-4"
        >
          Privacy
        </Link>
      </div>
    </aside>
  );
}

export function AnalyticsConsentPreferences() {
  const { decision, ready } = useDecision();
  if (!ready) return null;

  if (!browserAnalyticsConfigured()) {
    return (
      <p className="text-sm leading-6 text-slate-600">
        Optional PostHog analytics is not configured in this build.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-sm text-slate-700">
        Current choice: <strong>{decision === "granted" ? "allowed" : decision === "denied" ? "declined" : "not decided"}</strong>.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => applyDecision("granted")}
          className="min-h-11 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Allow analytics
        </button>
        <button
          type="button"
          onClick={() => applyDecision("denied")}
          className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900"
        >
          Decline analytics
        </button>
      </div>
    </div>
  );
}
