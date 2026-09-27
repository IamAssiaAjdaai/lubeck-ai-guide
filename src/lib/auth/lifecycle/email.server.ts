import "server-only";
import { after } from "next/server";
import { isSharedLocale, t } from "@citywalk/i18n";
import { getBetterAuthEnvironment } from "../env";
import { LifecycleError } from "./rateLimit.server";

export function resetEmailConfiguration() {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.CITYWALK_EMAIL_FROM?.trim();
  // Bare sender address on an operator-verified CITYWALK domain; never a user input.
  if (!key || !from || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(from)) throw new LifecycleError("UNAVAILABLE");
  const base = getBetterAuthEnvironment().baseURL;
  const origin = typeof base === "string" ? base : base.fallback;
  if (new URL(origin).protocol !== "https:" && process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test") throw new LifecycleError("UNAVAILABLE");
  return { key, from, origin };
}

export async function sendPasswordResetEmail(input: { user: { email: string }; token: string }, request?: Request) {
  // Schedule after the response: provider latency cannot reveal account existence.
  resetEmailConfiguration();
  after(() => deliverPasswordResetEmail(input, request));
}

export async function deliverPasswordResetEmail(input: { user: { email: string }; token: string }, request?: Request) {
  const { key, from, origin } = resetEmailConfiguration();
  const selected = request?.headers.get("x-citywalk-locale");
  const locale = isSharedLocale(selected) ? selected : "en";
  const link = new URL("/account/reset-password", origin);
  link.searchParams.set("locale", locale);
  // Fragments are not sent to the server. The reset page removes this immediately.
  link.hash = new URLSearchParams({ token: input.token }).toString();
  try {
    const result = await fetch("https://api.resend.com/emails", {
      method: "POST", signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [input.user.email], subject: t(locale, "lifecycle.emailSubject"),
        text: `${t(locale, "lifecycle.emailBody")}\n\n${link.toString()}\n\n${t(locale, "lifecycle.emailIgnore")}` }),
    });
    if (!result.ok) throw new Error("delivery-failed");
    // Provider acceptance is not inbox delivery. Never return a delivery claim.
  } catch {
    // Same public acknowledgement for unknown accounts and failed delivery: do not
    // expose existence through provider errors. Missing configuration fails before lookup.
    // No recipient, provider body, token, URL or Error object is logged.
    console.warn("[account-lifecycle] reset_email_delivery_failed");
  }
}
