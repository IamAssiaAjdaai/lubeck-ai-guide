import type { Metadata } from "next";
import Link from "next/link";

import { CITYWALK_SUPPORT_EMAIL } from "@/lib/legal";
import { citywalkPublicUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Support | CITYWALK",
  description: "Get help with CITYWALK accounts, purchases, walking features, privacy and app issues.",
  alternates: { canonical: citywalkPublicUrl("/support") },
  robots: { index: true, follow: true },
};

const supportTopics = [
  {
    title: "Account and sign-in",
    body: "For sign-in, email verification, password reset or connected-account issues, tell us which sign-in method you used and what happened. Never send us your password or one-time verification codes.",
  },
  {
    title: "Purchases and Premium access",
    body: "For City Pass or Premium access questions, include the platform you purchased on and the CITYWALK account email you used. Do not send card numbers or store passwords.",
  },
  {
    title: "Walks, GPS, audio and Ask CITYWALK",
    body: "For a traveler-flow problem, include the city, the screen or action that failed, your device model and OS version, and whether the issue happens again after reopening the app.",
  },
  {
    title: "Privacy and account deletion",
    body: "Privacy questions can be sent to the same support address. Account deletion is also available through CITYWALK account controls and the public deletion resource linked below.",
  },
] as const;

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <Link href="/" className="font-extrabold tracking-[-0.04em] text-blue-700">CITYWALK</Link>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600" aria-label="Support navigation">
            <Link href="/privacy" className="hover:text-blue-700">Privacy</Link>
            <Link href="/terms" className="hover:text-blue-700">Terms</Link>
            <Link href="/imprint" className="hover:text-blue-700">Imprint</Link>
            <Link href="/account-deletion" className="hover:text-blue-700">Account deletion</Link>
          </nav>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Support</p>
        <h1 className="mt-3 text-4xl font-bold tracking-[-0.045em] sm:text-5xl">Need help with CITYWALK?</h1>
        <p className="mt-5 text-lg leading-8 text-slate-600">
          Send us a short description of the problem and the details needed to reproduce it. CITYWALK support does not require your password, payment-card number or store password.
        </p>

        <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-2xl font-bold tracking-[-0.025em]">Contact</h2>
          <p className="mt-3 leading-7 text-slate-700">
            Email <a className="font-medium text-blue-700 underline underline-offset-4" href={"mailto:" + CITYWALK_SUPPORT_EMAIL}>{CITYWALK_SUPPORT_EMAIL}</a>.
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Please do not send passwords, verification codes, full payment credentials or other secrets.</p>
        </section>

        <div className="mt-10 space-y-6">
          {supportTopics.map(topic => (
            <section key={topic.title} className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-bold">{topic.title}</h2>
              <p className="mt-3 leading-7 text-slate-700">{topic.body}</p>
            </section>
          ))}
        </div>

        <section className="mt-10">
          <h2 className="text-2xl font-bold tracking-[-0.025em]">Useful links</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-700">
            <li><Link className="font-medium text-blue-700 underline underline-offset-4" href="/account-deletion">Account deletion</Link></li>
            <li><Link className="font-medium text-blue-700 underline underline-offset-4" href="/privacy">Privacy notice</Link></li>
            <li><Link className="font-medium text-blue-700 underline underline-offset-4" href="/terms">Terms of use</Link></li>
            <li><Link className="font-medium text-blue-700 underline underline-offset-4" href="/imprint">Imprint</Link></li>
          </ul>
        </section>

        <aside className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
          CITYWALK support is not an emergency or safety service. For urgent real-world assistance, use the appropriate local emergency or public service.
        </aside>
      </article>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap justify-between gap-3 px-6 py-6 text-sm text-slate-600">
          <span>© 2026 CITYWALK</span>
          <Link href="/">Back to CITYWALK</Link>
        </div>
      </footer>
    </main>
  );
}
