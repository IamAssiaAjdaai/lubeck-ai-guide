import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Delete your CITYWALK account",
  description: "How to delete your CITYWALK account and the personal data connected to it.",
  alternates: { canonical: "/account-deletion" },
  robots: { index: true, follow: true },
};

export default function AccountDeletionPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16 sm:px-8 sm:py-24">
      <Link href="/" className="text-sm font-semibold text-blue-700 hover:underline">
        CITYWALK
      </Link>

      <h1 className="mt-8 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
        Delete your CITYWALK account
      </h1>

      <p className="mt-6 text-lg leading-8 text-slate-700">
        CITYWALK is implementing account deletion for signed-in travelers. This page will be the public account-deletion resource used by CITYWALK once the in-app deletion flow is complete.
      </p>

      <section className="mt-12 space-y-4">
        <h2 className="text-2xl font-semibold text-slate-950">Current status</h2>
        <p className="leading-7 text-slate-700">
          Account deletion is not yet available in the public app. We will not publish instructions that claim deletion is available before the complete deletion flow has been implemented and verified.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-2xl font-semibold text-slate-950">What the finished flow will cover</h2>
        <p className="leading-7 text-slate-700">
          The finished flow will let a signed-in traveler initiate deletion from CITYWALK, confirm the destructive action, remove CITYWALK account data that does not need to be retained, clear local traveler data, and sign the deleted account out.
        </p>
        <p className="leading-7 text-slate-700">
          Purchase and subscription records may require separate handling for store, provider, accounting, or legal purposes. This page will describe that handling only after the final behavior is implemented and verified.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-2xl font-semibold text-slate-950">Subscriptions</h2>
        <p className="leading-7 text-slate-700">
          Deleting a CITYWALK account is separate from cancelling a subscription or requesting a refund. Final subscription instructions will be added here before public launch.
        </p>
      </section>

      <p className="mt-14 border-t border-slate-200 pt-8 text-sm leading-6 text-slate-600">
        This page is a launch-readiness placeholder and will be updated to match the verified production deletion process before CITYWALK is submitted to an app store.
      </p>
    </main>
  );
}
