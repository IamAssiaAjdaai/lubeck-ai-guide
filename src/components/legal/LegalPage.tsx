import type { ReactNode } from "react";
import Link from "next/link";

import type { LegalOperator } from "@/lib/legal";

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
    <main className="min-h-screen bg-slate-50 text-slate-950 [overflow-wrap:anywhere]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <Link href="/" className="font-extrabold tracking-[-0.04em] text-blue-700">
            CITYWALK
          </Link>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600" aria-label="Legal navigation">
            <Link href="/privacy" className="hover:text-blue-700">Privacy</Link>
            <Link href="/terms" className="hover:text-blue-700">Terms</Link>
            <Link href="/imprint" className="hover:text-blue-700">Imprint</Link>
            <Link href="/account-deletion" className="hover:text-blue-700">Account deletion</Link>
            <Link href="/support" className="hover:text-blue-700">Support</Link>
          </nav>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-bold tracking-[-0.045em] sm:text-5xl">{title}</h1>
        <p className="mt-5 text-lg leading-8 text-slate-600">{intro}</p>

        {!operator.isConfigured ? (
          <aside className="mt-8 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-6 text-amber-950" role="note">
            <strong className="block">Pre-launch legal configuration is incomplete.</strong>
            <span>
              This build must not be released publicly until the legal operator identity is configured. Missing: {operator.missingRequiredFields.join(", ")}.
            </span>
          </aside>
        ) : null}

        <div className="mt-10 space-y-10 [&_a]:font-medium [&_a]:text-blue-700 [&_a]:underline [&_a]:underline-offset-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-[-0.025em] [&_h3]:text-lg [&_h3]:font-semibold [&_li]:leading-7 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_p]:leading-7 [&_p]:text-slate-700 [&_section]:space-y-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
          {children}
        </div>
      </article>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap justify-between gap-3 px-6 py-6 text-sm text-slate-600">
          <span>© 2026 CITYWALK</span>
          <a href={`mailto:${operator.supportEmail}`} className="hover:text-blue-700">{operator.supportEmail}</a>
        </div>
      </footer>
    </main>
  );
}
