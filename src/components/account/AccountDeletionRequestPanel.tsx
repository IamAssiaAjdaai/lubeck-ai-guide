"use client";

import { FormEvent, useEffect, useState } from "react";

type RequestState = "idle" | "sending" | "sent" | "error";
type ConfirmState = "idle" | "deleting" | "deleted" | "expired" | "blocked" | "error";

export function AccountDeletionRequestPanel() {
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [confirmState, setConfirmState] = useState<ConfirmState>("idle");
  const [token, setToken] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    // Read the fragment only after hydration. Scheduling the browser sync keeps the
    // effect focused on the external URL state and avoids a synchronous state cascade.
    const frame = window.requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const value = params.get("token");
      if (value) {
        setToken(value);
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  async function requestDeletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestState("sending");
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();

    try {
      const response = await fetch("/api/account/delete-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setRequestState(response.ok ? "sent" : "error");
    } catch {
      setRequestState("error");
    }
  }

  async function confirmDeletion() {
    if (!token || !confirmed) return;
    setConfirmState("deleting");
    try {
      const response = await fetch("/api/account/delete-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, confirm: true }),
      });
      if (response.ok) {
        setToken(null);
        setConfirmState("deleted");
        return;
      }
      if (response.status === 400) {
        setConfirmState("expired");
        return;
      }
      if (response.status === 409) {
        setConfirmState("blocked");
        return;
      }
      setConfirmState("error");
    } catch {
      setConfirmState("error");
    }
  }

  if (confirmState === "deleted") {
    return (
      <section className="mt-12 rounded-2xl border border-emerald-200 bg-emerald-50 p-6" aria-live="polite">
        <h2 className="text-2xl font-semibold text-slate-950">Your CITYWALK account has been deleted</h2>
        <p className="mt-3 leading-7 text-slate-700">
          Your server-side account and account-owned traveler data were removed. Store subscription billing is managed separately by Apple or Google.
        </p>
      </section>
    );
  }

  if (token) {
    return (
      <section className="mt-12 rounded-2xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-2xl font-semibold text-slate-950">Confirm permanent deletion</h2>
        <p className="mt-3 leading-7 text-slate-700">
          This permanently deletes your CITYWALK account and account-owned traveler data. This action cannot be undone.
        </p>
        <label className="mt-5 flex items-start gap-3 text-sm leading-6 text-slate-800">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4"
            checked={confirmed}
            onChange={event => setConfirmed(event.target.checked)}
          />
          <span>I understand that this permanently deletes my CITYWALK account.</span>
        </label>
        <button
          type="button"
          className="mt-5 min-h-11 rounded-xl bg-red-700 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!confirmed || confirmState === "deleting"}
          onClick={() => void confirmDeletion()}
        >
          {confirmState === "deleting" ? "Deleting account…" : "Delete my account permanently"}
        </button>
        {confirmState === "expired" ? (
          <p className="mt-4 text-sm leading-6 text-red-800" role="alert">
            This confirmation link is invalid, expired, or already used. Request a new link below.
          </p>
        ) : null}
        {confirmState === "blocked" ? (
          <p className="mt-4 text-sm leading-6 text-red-800" role="alert">
            This account needs a manual retention review before it can be deleted. Contact support@getcitywalk.com.
          </p>
        ) : null}
        {confirmState === "error" ? (
          <p className="mt-4 text-sm leading-6 text-red-800" role="alert">
            The deletion request could not be completed. Please try again or contact support@getcitywalk.com.
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-950">Request account deletion</h2>
      <p className="mt-3 leading-7 text-slate-700">
        Enter the email address connected to your CITYWALK account. If an account exists, we will send a one-time confirmation link that expires after 30 minutes.
      </p>
      <form className="mt-5 space-y-4" onSubmit={requestDeletion}>
        <div>
          <label htmlFor="account-deletion-email" className="mb-2 block text-sm font-semibold text-slate-900">
            Account email
          </label>
          <input
            id="account-deletion-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            disabled={requestState === "sending"}
            className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <button
          type="submit"
          disabled={requestState === "sending"}
          className="min-h-11 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {requestState === "sending" ? "Sending…" : "Send deletion confirmation"}
        </button>
      </form>
      {requestState === "sent" ? (
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900" role="status">
          If a CITYWALK account exists for that address, a confirmation email has been scheduled. Check your inbox and spam folder.
        </p>
      ) : null}
      {requestState === "error" ? (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-800" role="alert">
          We could not accept the request right now. Please try again later or contact support@getcitywalk.com.
        </p>
      ) : null}
    </section>
  );
}
