import "server-only";
import { after } from "next/server";
import { isSharedLocale, t } from "@citywalk/i18n";
import { getBetterAuthEnvironment } from "../env";
import { LifecycleError } from "./rateLimit.server";

type AuthEmailInput = Readonly<{
  user: Readonly<{ email: string }>;
}>;

type VerificationEmailInput = AuthEmailInput & Readonly<{
  url: string;
}>;

function authEmailConfiguration() {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.CITYWALK_EMAIL_FROM?.trim();
  // Bare sender address on an operator-verified CITYWALK domain; never a user input.
  if (!key || !from || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(from)) {
    throw new LifecycleError("UNAVAILABLE");
  }
  const base = getBetterAuthEnvironment().baseURL;
  const origin = typeof base === "string" ? base : base.fallback;
  if (
    new URL(origin).protocol !== "https:" &&
    process.env.NODE_ENV !== "development" &&
    process.env.NODE_ENV !== "test"
  ) {
    throw new LifecycleError("UNAVAILABLE");
  }
  return { key, from, origin };
}

export function resetEmailConfiguration() {
  return authEmailConfiguration();
}

function requestLocale(request?: Request) {
  const selected = request?.headers.get("x-citywalk-locale");
  return isSharedLocale(selected) ? selected : "en";
}

function trustedVerificationUrl(value: string, origin: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new LifecycleError("UNAVAILABLE");
  }
  const expectedOrigin = new URL(origin).origin;
  if (url.origin !== expectedOrigin || url.pathname !== "/api/auth/verify-email") {
    throw new LifecycleError("UNAVAILABLE");
  }
  return url.toString();
}

async function sendResendEmail(input: {
  key: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  failureCode: string;
}) {
  try {
    const result = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: {
        Authorization: `Bearer ${input.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: input.from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
      }),
    });
    if (!result.ok) throw new Error("delivery-failed");
    // Provider acceptance is not inbox delivery. Never return a delivery claim.
  } catch {
    // Never log recipient, provider body, token, URL or Error object.
    console.warn(`[account-lifecycle] ${input.failureCode}`);
  }
}

export async function sendPasswordResetEmail(
  input: AuthEmailInput & Readonly<{ token: string }>,
  request?: Request,
) {
  // Schedule after the response: provider latency cannot reveal account existence.
  authEmailConfiguration();
  after(() => deliverPasswordResetEmail(input, request));
}

export async function deliverPasswordResetEmail(
  input: AuthEmailInput & Readonly<{ token: string }>,
  request?: Request,
) {
  const { key, from, origin } = authEmailConfiguration();
  const locale = requestLocale(request);
  const link = new URL("/account/reset-password", origin);
  link.searchParams.set("locale", locale);
  // Fragments are not sent to the server. The reset page removes this immediately.
  link.hash = new URLSearchParams({ token: input.token }).toString();

  await sendResendEmail({
    key,
    from,
    to: input.user.email,
    subject: t(locale, "lifecycle.emailSubject"),
    text: `${t(locale, "lifecycle.emailBody")}\n\n${link.toString()}\n\n${t(locale, "lifecycle.emailIgnore")}`,
    failureCode: "reset_email_delivery_failed",
  });
}

export async function sendEmailVerificationEmail(
  input: VerificationEmailInput,
  request?: Request,
) {
  const { origin } = authEmailConfiguration();
  // Better Auth owns the signed token. Only its configured same-origin verification
  // endpoint may be sent; caller-controlled callback URLs stay inside that signed URL.
  trustedVerificationUrl(input.url, origin);
  after(() => deliverEmailVerificationEmail(input, request));
}

export async function deliverEmailVerificationEmail(
  input: VerificationEmailInput,
  request?: Request,
) {
  const { key, from, origin } = authEmailConfiguration();
  const locale = requestLocale(request);
  const link = trustedVerificationUrl(input.url, origin);

  await sendResendEmail({
    key,
    from,
    to: input.user.email,
    subject: t(locale, "lifecycle.verificationEmailSubject"),
    text: `${t(locale, "lifecycle.verificationEmailBody")}\n\n${link}\n\n${t(locale, "lifecycle.verificationEmailIgnore")}`,
    failureCode: "verification_email_delivery_failed",
  });
}
