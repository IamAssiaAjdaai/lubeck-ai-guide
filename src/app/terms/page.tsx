import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";

import { LegalPage } from "@/components/legal/LegalPage";
import {
  CITYWALK_SUPPORT_EMAIL,
  getLegalOperator,
  LEGAL_LAST_UPDATED,
  legalRobots,
} from "@/lib/legal";
import { citywalkPublicUrl } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const operator = getLegalOperator();
  return {
    title: "Terms | CITYWALK",
    description: "Terms for the free CITYWALK Public Beta, accounts and walking features.",
    alternates: { canonical: citywalkPublicUrl("/terms") },
    robots: legalRobots(operator),
  };
}

export default async function TermsPage() {
  await connection();
  const operator = getLegalOperator();

  return (
    <LegalPage
      eyebrow="Terms"
      title="Terms of use"
      intro="These terms govern use of CITYWALK’s website, app and city content during the free Public Beta. Mandatory consumer rights remain unaffected."
      operator={operator}
    >
      <section>
        <h2>1. Provider and scope</h2>
        {operator.isConfigured ? (
          <p>
            CITYWALK is provided by <strong>{operator.name}</strong>, {operator.streetAddress}, {operator.postalCity}, {operator.country}. Contact: <a href={`mailto:${CITYWALK_SUPPORT_EMAIL}`}>{CITYWALK_SUPPORT_EMAIL}</a>.
          </p>
        ) : (
          <p>The legal provider identity is intentionally not fabricated in this pre-launch build and must be configured before public release.</p>
        )}
        <p>
          These terms apply when you access or use CITYWALK. Additional terms from Apple, Google, a payment provider or another platform can apply to purchases or accounts handled through that platform.
        </p>
      </section>

      <section>
        <h2>2. What CITYWALK provides</h2>
        <p>
          CITYWALK helps you discover places, plan and follow city walks and access city content. Public AI Guide access is disabled during this Public Beta. Feature availability varies by city, device, language, connection and release stage.
        </p>
        <p>
          The service is designed for leisure and informational use. It is not an emergency service, professional safety service or guaranteed turn-by-turn navigation system.
        </p>
      </section>

      <section>
        <h2>3. Accounts</h2>
        <p>
          Some functions can be used without an account, while saving or synchronizing certain data may require sign-in. You must provide accurate account information, protect your sign-in credentials and not give another person unauthorized access to your account.
        </p>
        <p>
          We may restrict an account where reasonably necessary to protect users or the service, investigate misuse, comply with law or address a serious breach of these terms. Any mandatory rights to notice, remedy or access are not excluded.
        </p>
      </section>

      <section>
        <h2>4. Free Public Beta</h2>
        <p>
          The current Public Beta is free. Live payments, paid city passes and recurring paid plans are disabled. Creating or using a Beta account does not authorize a payment or automatically start a paid subscription.
        </p>
        <p>
          Any future paid offer would require separate product information and a purchase decision. No future price, launch date, paid entitlement or permanent free availability is promised here.
        </p>
      </section>

      <section>
        <h2>5. Existing purchases and consumer rights</h2>
        <p>
          No new purchases or subscriptions are offered in the current Public Beta. If you already hold a store subscription from an earlier offering, if applicable, its management remains available through the relevant store account controls; these Beta terms do not change any existing statutory rights.
        </p>
        <p>
          Deleting a CITYWALK account does not itself cancel a store subscription and does not automatically create a refund. You should separately manage an active Apple or Google subscription in the relevant store account.
        </p>
        <p>
          Nothing in these terms removes mandatory withdrawal, refund, warranty or other consumer-protection rights that apply to you, including where a digital service is provided without a monetary price. Store procedures do not replace those rights.
        </p>
      </section>

      <section>
        <h2>6. Ask CITYWALK and generated answers</h2>
        <p>
          AI-generated answers can be incomplete, outdated or wrong even when CITYWALK uses curated source material and grounding checks. Do not rely on an AI answer as the sole source for safety-critical, legal, medical, accessibility, opening-hours, transport or emergency decisions.
        </p>
        <p>
          Ask CITYWALK is unavailable in the current Public Beta. The information above describes risks of generated answers if that feature is offered in a later release; it does not promise an AI allowance or access date.
        </p>
      </section>

      <section>
        <h2>7. Walking, location and route information</h2>
        <p>
          Distances, walking times, return-time estimates, route suggestions and nearby information are estimates. Streets, construction, closures, weather, accessibility and real-world conditions can change. Always follow local signs, traffic rules, access restrictions and your own judgment.
        </p>
        <p>
          You are responsible for deciding whether a route or activity is suitable for you. Stop using the device while moving whenever attention to the screen would be unsafe.
        </p>
      </section>

      <section>
        <h2>8. Acceptable use</h2>
        <p>You must not:</p>
        <ul>
          <li>use CITYWALK unlawfully or to harm, harass or deceive others;</li>
          <li>attempt to bypass access controls, rate limits, purchase checks or security measures;</li>
          <li>interfere with the service, probe it without authorization, distribute malware or automate abusive traffic;</li>
          <li>copy, scrape, resell or redistribute protected CITYWALK content beyond what applicable law permits; or</li>
          <li>use another person’s account or payment entitlement without authorization.</li>
        </ul>
      </section>

      <section>
        <h2>9. Intellectual property</h2>
        <p>
          CITYWALK software, branding, original text, audio, graphics and other protected material remain the property of their respective rights holders. Subject to these terms, you receive a limited, personal, non-exclusive and non-transferable right to use the service for its intended purpose.
        </p>
      </section>

      <section>
        <h2>10. Availability and changes</h2>
        <p>
          We may maintain, improve, add, remove or replace features and city content. We do not promise uninterrupted availability. Changes will not remove mandatory contractual or consumer rights, including rights that may apply to a free digital service.
        </p>
      </section>

      <section>
        <h2>11. Liability</h2>
        <p>
          CITYWALK does not exclude or limit liability where exclusion or limitation is prohibited by law, including mandatory liability for intent, gross negligence, injury to life, body or health, or mandatory product-liability rules. Any further limitations apply only to the extent permitted by applicable law.
        </p>
      </section>

      <section>
        <h2>12. Account deletion and privacy</h2>
        <p>
          You can request account deletion from supported account controls or through the public <Link href="/account-deletion">account-deletion page</Link>. Details about personal-data processing and deletion are in the <Link href="/privacy">privacy notice</Link>.
        </p>
      </section>

      <section>
        <h2>13. Governing law</h2>
        <p>
          German law applies to the extent permitted by law. If you are a consumer, mandatory protections of the country in which you habitually reside remain unaffected where applicable.
        </p>
      </section>

      <section>
        <h2>14. Contact and updates</h2>
        <p>
          Questions can be sent to <a href={`mailto:${CITYWALK_SUPPORT_EMAIL}`}>{CITYWALK_SUPPORT_EMAIL}</a>. We may update these terms when the service or legal requirements change. The version shown here was last updated on {LEGAL_LAST_UPDATED}.
        </p>
      </section>
    </LegalPage>
  );
}
