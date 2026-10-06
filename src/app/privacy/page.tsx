import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "@/components/legal/LegalPage";
import {
  CITYWALK_SUPPORT_EMAIL,
  getLegalOperator,
  LEGAL_LAST_UPDATED,
  legalRobots,
} from "@/lib/legal";
import { citywalkPublicUrl } from "@/lib/site";

export function generateMetadata(): Metadata {
  const operator = getLegalOperator();
  return {
    title: "Privacy | CITYWALK",
    description: "How CITYWALK processes personal data when you use the website, app, AI Guide, account and paid features.",
    alternates: { canonical: citywalkPublicUrl("/privacy") },
    robots: legalRobots(operator),
  };
}

export default function PrivacyPage() {
  const operator = getLegalOperator();

  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy notice"
      intro="This notice explains what personal data CITYWALK processes, why it is needed, which service providers may receive it, and the choices and rights available to you."
      operator={operator}
    >
      <section>
        <h2>1. Controller</h2>
        {operator.isConfigured ? (
          <address className="not-italic leading-7 text-slate-700">
            <strong className="text-slate-950">{operator.name}</strong><br />
            {operator.streetAddress}<br />
            {operator.postalCity}<br />
            {operator.country}<br />
            Email: <a href={`mailto:${CITYWALK_SUPPORT_EMAIL}`}>{CITYWALK_SUPPORT_EMAIL}</a>
          </address>
        ) : (
          <p>The controller identity is intentionally not fabricated in this pre-launch build. The required operator details must be configured before public release.</p>
        )}
      </section>

      <section>
        <h2>2. Data we process and why</h2>
        <h3>Accounts and sign-in</h3>
        <p>
          If you create an account, CITYWALK processes account and authentication data such as your email address, display name where provided, verification state, account-provider identifiers, sessions and security tokens. Password credentials are handled by the authentication system in protected form rather than stored as readable passwords.
        </p>
        <p>
          We use this data to create and secure your account, verify your email, sign you in, link supported sign-in methods and provide password recovery. The primary legal basis is performance of the service you request (Article 6(1)(b) GDPR). Security and abuse-prevention measures may additionally rely on our legitimate interest in protecting CITYWALK and its users (Article 6(1)(f) GDPR).
        </p>

        <h3>Traveler data and saved activity</h3>
        <p>
          Depending on the features you use, CITYWALK may process traveler preferences, saved places or walks, walk state, city access entitlements and similar account-linked product state. We process this information to provide the requested planning, saving, personalization and access features (Article 6(1)(b) GDPR).
        </p>

        <h3>Location</h3>
        <p>
          Location-enabled features request device or browser location permission when they need it. Current coordinates, accuracy and timestamps may be processed to provide nearby, live-walk or arrival features. Do not enable location access if you do not want to use those features. Ask CITYWALK intentionally withholds precise start and finish coordinates from the language-model prompt used for conversational guidance.
        </p>
        <p>
          Location is processed to provide a feature you explicitly request (Article 6(1)(b) GDPR). Device-level permission and any consent required for access to information on your device are handled through the relevant platform controls.
        </p>

        <h3>Ask CITYWALK / AI Guide</h3>
        <p>
          When you ask the AI Guide a question, CITYWALK sends the question, a limited amount of recent conversation history and relevant city/place/tour/walk context to the configured model provider, currently Groq. The service also processes usage counters needed to enforce daily allowances. We process this data to answer the question and provide the requested AI feature (Article 6(1)(b) GDPR).
        </p>

        <h3>Payments and paid access</h3>
        <p>
          If you purchase paid access, CITYWALK may process product, price, order, entitlement, subscription status and provider identifiers needed to grant and reconcile access. Web checkout, where offered, uses Stripe. Native purchases may involve Apple or Google and RevenueCat for entitlement/subscription reconciliation. Payment-card details are handled by the relevant payment or store provider rather than being collected directly by CITYWALK through the app interface.
        </p>
        <p>
          Purchase data is processed to perform the purchase and provide paid access (Article 6(1)(b) GDPR), to meet applicable legal obligations such as accounting requirements where relevant (Article 6(1)(c) GDPR), and for payment/reconciliation security where our legitimate interests apply (Article 6(1)(f) GDPR).
        </p>

        <h3>Transactional email</h3>
        <p>
          CITYWALK uses Resend to send operational emails such as email verification, password reset and account-deletion confirmation. The recipient address and message delivery data needed for that purpose are sent to the email provider. These messages are necessary to provide and secure the account lifecycle you requested (Article 6(1)(b) GDPR) and, where applicable, to protect accounts (Article 6(1)(f) GDPR).
        </p>

        <h3>Technical and security data</h3>
        <p>
          Requests can contain technical information such as IP address, request headers, timestamps and error/security signals. CITYWALK uses this information for delivery, rate limiting, troubleshooting, fraud/abuse prevention and service security. The legal basis is our legitimate interest in operating a reliable and secure service (Article 6(1)(f) GDPR).
        </p>
      </section>

      <section>
        <h2>3. Service providers and recipients</h2>
        <p>Personal data is shared only where needed to run a requested feature, secure the service, process a purchase or meet a legal obligation. Current categories and relevant providers include:</p>
        <ul>
          <li>hosting, content delivery, security and infrastructure providers, including Cloudflare where CITYWALK is deployed there;</li>
          <li>Groq for Ask CITYWALK model processing;</li>
          <li>Resend for transactional account email;</li>
          <li>Stripe for web checkout where offered;</li>
          <li>RevenueCat plus Apple and/or Google for native purchase and entitlement handling where applicable; and</li>
          <li>Google and Apple if you choose their supported social sign-in method.</li>
        </ul>
        <p>
          Some providers may process data outside the European Economic Area. Where required, CITYWALK relies on an applicable transfer mechanism and provider safeguards. The exact transfer position depends on the provider and service configuration in use at the time.
        </p>
      </section>

      <section>
        <h2>4. Storage on your device and analytics</h2>
        <p>
          CITYWALK uses device/browser storage where it is needed for requested product functions such as authentication/session state, traveler preferences, saved or active-walk state and similar app continuity. For pseudonymous web analytics, CITYWALK creates a random visitor identifier in local storage for up to 180 days and a random browser-session identifier for up to 24 hours. These identifiers are not derived from your email address, IP address, browser fingerprint or GPS coordinates.
        </p>
        <p>
          When the public PostHog project token and host are configured, CITYWALK&apos;s web code can initialize PostHog and record product events such as city or place views, published Marketing landing views and CTA clicks, together with the pseudonymous visitor/session identifiers and relevant city/campaign attribution. The current integration also enables client exception capture. The reviewed event contracts do not intentionally attach raw latitude/longitude, GPS trails, account email addresses or authentication tokens.
        </p>
        <p>
          PostHog capture checks the local PostHog opt-out state. Provider-side event retention and any consent control required before non-essential analytics is activated in production depend on the final production configuration and must be aligned before launch. CITYWALK does not use the reviewed PostHog integration as advertising tracking.
        </p>
      </section>

      <section>
        <h2>5. How long data is kept</h2>
        <p>
          CITYWALK does not publish invented fixed retention periods. Account and traveler data is kept only for as long as needed to provide the account/service, handle security and disputes, or satisfy applicable legal obligations. Data that is no longer required is deleted or anonymized according to the relevant lifecycle.
        </p>
        <p>
          When an eligible account is deleted, server-side account-owned authentication and traveler data is removed under the implemented deletion flow. Store order or subscription reconciliation records can remain detached from the deleted user where they must be retained for accounting, reconciliation or other legal purposes. Deletion also queues supported external customer/token erasure work for configured providers. A deletion started from the public website cannot directly erase data that exists only on a device that is offline or no longer connected to the account.
        </p>
      </section>

      <section>
        <h2>6. Account deletion</h2>
        <p>
          You can request deletion through CITYWALK account controls or the public <Link href="/account-deletion">account-deletion page</Link>. Account deletion is separate from cancelling an Apple or Google store subscription and does not itself create a store refund.
        </p>
      </section>

      <section>
        <h2>7. Your GDPR rights</h2>
        <p>Subject to the conditions of applicable law, you may have rights to:</p>
        <ul>
          <li>access personal data and receive information about its processing;</li>
          <li>rectify inaccurate or incomplete data;</li>
          <li>erase data or restrict processing;</li>
          <li>receive data portability where the legal requirements are met;</li>
          <li>object to processing based on legitimate interests; and</li>
          <li>withdraw consent for the future where processing is based on consent.</li>
        </ul>
        <p>
          You also have the right to lodge a complaint with a competent data-protection supervisory authority. To exercise a privacy right or ask a question, email <a href={`mailto:${CITYWALK_SUPPORT_EMAIL}`}>{CITYWALK_SUPPORT_EMAIL}</a>.
        </p>
      </section>

      <section>
        <h2>8. Changes to this notice</h2>
        <p>
          We update this notice when CITYWALK features, providers or legal requirements materially change. The version shown here was last updated on {LEGAL_LAST_UPDATED}.
        </p>
      </section>
    </LegalPage>
  );
}
