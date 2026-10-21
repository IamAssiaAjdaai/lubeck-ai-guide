import type { Metadata } from "next";

import { PublicInfoLayout } from "@/components/legal/PublicInfoLayout";
import { AccountDeletionRequestPanel } from "@/components/account/AccountDeletionRequestPanel";
import { citywalkPublicUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Delete your CITYWALK account",
  description: "Request deletion of your CITYWALK account and associated traveler data.",
  alternates: { canonical: citywalkPublicUrl("/account-deletion") },
  robots: { index: true, follow: true },
};

export default function AccountDeletionPage() {
  return (
    <PublicInfoLayout>
      <h1 className="mt-8 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
        Delete your CITYWALK account
      </h1>

      <p className="mt-6 text-lg leading-8 text-slate-700">
        You can request permanent deletion from CITYWALK account settings in the app or from this page. The web flow verifies the email address connected to the account before deletion.
      </p>

      <AccountDeletionRequestPanel />

      <section className="mt-12 space-y-4">
        <h2 className="text-2xl font-semibold text-slate-950">What is deleted</h2>
        <p className="leading-7 text-slate-700">
          A completed deletion removes the CITYWALK user account, authentication sessions and linked account-owned traveler data such as the traveler profile, account links and saved walks. CITYWALK customer mapping and entitlement rows are removed with the account.
        </p>
        <p className="leading-7 text-slate-700">
          CITYWALK also records a server-side erasure job for the linked RevenueCat customer profile so third-party customer data can be removed without making the external network request part of the database deletion transaction.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-2xl font-semibold text-slate-950">Data that may remain after account deletion</h2>
        <p className="leading-7 text-slate-700">
          Store order and subscription transaction records are kept separately from the deleted CITYWALK account. Their CITYWALK user reference is removed when the account is deleted. Short-lived operational rate-limit records contain pseudonymous identifiers rather than the account ID and expire automatically within about 48 hours.
        </p>
        <p className="leading-7 text-slate-700">
          Staff or editorial accounts can require a manual retention review because historical publishing or audit records may need to remain attributable. The automated traveler deletion flow does not silently remove those records.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-2xl font-semibold text-slate-950">Subscriptions and refunds</h2>
        <p className="leading-7 text-slate-700">
          Deleting a CITYWALK account does not cancel an App Store or Google Play subscription and does not request a refund. Store billing is managed separately.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://apps.apple.com/account/subscriptions"
            rel="noreferrer"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:border-slate-500"
          >
            Manage Apple subscriptions
          </a>
          <a
            href="https://play.google.com/store/account/subscriptions"
            rel="noreferrer"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:border-slate-500"
          >
            Manage Google Play subscriptions
          </a>
        </div>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-2xl font-semibold text-slate-950">Device data</h2>
        <p className="leading-7 text-slate-700">
          When you delete your account from inside the CITYWALK app, traveler-local data on that device is cleared after the server confirms deletion. A web request cannot directly erase storage on another device, but server sessions for the deleted account are invalidated.
        </p>
      </section>

      <p className="mt-14 border-t border-slate-200 pt-8 text-sm leading-6 text-slate-600">
        Need help with an account-deletion request? Contact <a className="font-semibold text-blue-700 hover:underline" href="mailto:support@getcitywalk.com">support@getcitywalk.com</a>.
      </p>
    </PublicInfoLayout>
  );
}
