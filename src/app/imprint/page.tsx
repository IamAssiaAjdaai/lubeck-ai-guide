import type { Metadata } from "next";
import { connection } from "next/server";

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
    title: "Imprint | CITYWALK",
    description: "Provider information for CITYWALK.",
    alternates: { canonical: citywalkPublicUrl("/imprint") },
    robots: legalRobots(operator),
  };
}

export default async function ImprintPage() {
  await connection();
  const operator = getLegalOperator();

  return (
    <LegalPage
      eyebrow="Legal notice"
      title="Imprint"
      intro="Provider information for CITYWALK under the German Digital Services Act (DDG)."
      operator={operator}
    >
      <section>
        <h2>Provider</h2>
        {operator.isConfigured ? (
          <address className="not-italic leading-7 text-slate-700">
            <strong className="text-slate-950">{operator.name}</strong><br />
            {operator.streetAddress}<br />
            {operator.postalCity}<br />
            {operator.country}
          </address>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
            <p><strong>Not configured for public release.</strong></p>
            <p>The operator name and service address are intentionally not guessed. Configure the missing legal identity fields before deployment.</p>
          </div>
        )}
      </section>

      {operator.representative ? (
        <section>
          <h2>Represented by</h2>
          <p>{operator.representative}</p>
        </section>
      ) : null}

      <section>
        <h2>Contact</h2>
        <p>Email: <a href={`mailto:${CITYWALK_SUPPORT_EMAIL}`}>{CITYWALK_SUPPORT_EMAIL}</a></p>
      </section>

      {operator.registerName || operator.registerNumber ? (
        <section>
          <h2>Register</h2>
          {operator.registerName ? <p>Register: {operator.registerName}</p> : null}
          {operator.registerNumber ? <p>Registration number: {operator.registerNumber}</p> : null}
        </section>
      ) : null}

      {operator.vatId ? (
        <section>
          <h2>VAT identification number</h2>
          <p>{operator.vatId}</p>
        </section>
      ) : null}

      <section>
        <h2>Content note</h2>
        <p>
          CITYWALK provides travel and city information for general informational and leisure purposes. Third-party content is supplied by the relevant provider. Mandatory legal responsibilities remain unaffected.
        </p>
      </section>

      <section>
        <h2>Last updated</h2>
        <p>{LEGAL_LAST_UPDATED}</p>
      </section>
    </LegalPage>
  );
}
