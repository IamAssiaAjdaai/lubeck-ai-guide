import type { ReactNode } from "react";

import type { LegalOperator } from "@/lib/legal";

import { PublicInfoLayout } from "./PublicInfoLayout";

export function LegalPage({
  title,
  eyebrow,
  intro,
  operator,
  children,
}: {
  title: string;
  eyebrow: string;
  intro: string;
  operator: LegalOperator;
  children: ReactNode;
}) {
  return (
    <PublicInfoLayout>
      <article>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-bold tracking-[-0.045em] sm:text-5xl">{title}</h1>
        <p className="mt-5 text-lg leading-8 text-slate-600">{intro}</p>

        {!operator.isConfigured || !operator.publicationApproved ? (
          <aside className="mt-8 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-6 text-amber-950" role="note">
            <strong className="block">{operator.isConfigured ? "Legal publication approval is pending." : "Pre-launch legal configuration is incomplete."}</strong>
            <span>
              {operator.isConfigured
                ? "This legal notice will be available after publication approval. Contact support for assistance."
                : "This legal notice is not yet ready for publication. Contact support for assistance."}
            </span>
            <a className="mt-2 block underline underline-offset-4" href={`mailto:${operator.supportEmail}`}>{operator.supportEmail}</a>
          </aside>
        ) : null}

        <div className="mt-10 space-y-10 [&_a]:font-medium [&_a]:text-blue-700 [&_a]:underline [&_a]:underline-offset-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-[-0.025em] [&_h3]:text-lg [&_h3]:font-semibold [&_li]:leading-7 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_p]:leading-7 [&_p]:text-slate-700 [&_section]:space-y-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
          {operator.isConfigured && operator.publicationApproved ? children : null}
        </div>
      </article>
    </PublicInfoLayout>
  );
}
