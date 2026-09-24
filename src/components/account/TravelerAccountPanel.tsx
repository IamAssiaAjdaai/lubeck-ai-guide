"use client";

import { CreditCard, LogIn, LogOut, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import type { AccountCopy } from "@/lib/account/copy";
import { authClient } from "@/lib/auth/client";
import { languages, type Locale } from "@/lib/i18n";
import { getBrowserVisitorSessionIdentity } from "@/lib/visitorSession";

type TravelerAccountPanelProps = Readonly<{
  locale: Locale;
  nextHref: string;
  copy: AccountCopy;
  initialUser?: Readonly<{
    name: string;
    email: string;
  }>;
}>;

type AuthMode = "sign-in" | "sign-up";

export function TravelerAccountPanel({
  locale,
  nextHref,
  copy,
  initialUser,
}: TravelerAccountPanelProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function linkGuestTrip(): Promise<boolean> {
    const identity = getBrowserVisitorSessionIdentity();
    const response = await fetch("/api/account/link-guest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...identity,
        preferredLocale: locale,
      }),
    });

    return response.ok;
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setNotice(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(copy.genericSignInError);
        return;
      }

      if (!(await linkGuestTrip())) {
        setError(copy.guestLinkError);
        router.refresh();
        return;
      }

      router.replace(nextHref);
      router.refresh();
    } catch {
      setError(copy.genericSignInError);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setNotice(null);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const result = await authClient.signUp.email({ name, email, password });
      if (result.error) {
        setError(copy.genericSignUpError);
        return;
      }

      setMode("sign-in");
      setNotice(copy.accountCreated);
    } catch {
      setError(copy.genericSignUpError);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignOut() {
    setIsLoading(true);
    try {
      await authClient.signOut();
    } finally {
      router.refresh();
      setIsLoading(false);
    }
  }

  if (initialUser) {
    return (
      <section className="surface-card mt-6 p-5">
        <p className="text-sm text-text-secondary">{copy.signedInAs}</p>
        <p className="mt-1 text-lg font-semibold">{initialUser.name}</p>
        <p className="mt-1 text-sm text-text-secondary">{initialUser.email}</p>
        <p className="mt-4 text-sm text-text-secondary">
          {copy.preferredLanguage}: {languages[locale].nativeName}
        </p>
        <Link
          href={`/${locale}/account/purchases`}
          className="button-primary mt-5 w-full"
        >
          <CreditCard aria-hidden="true" size={18} />
          {copy.purchasesAndAccess}
        </Link>
        <button
          type="button"
          className="button-secondary mt-3 w-full"
          disabled={isLoading}
          onClick={() => void handleSignOut()}
        >
          <LogOut aria-hidden="true" size={18} />
          {isLoading ? copy.signingOut : copy.signOut}
        </button>
      </section>
    );
  }

  const isSignIn = mode === "sign-in";

  return (
    <section className="surface-card mt-6 p-5">
      <div className="grid grid-cols-2 rounded-xl bg-surface p-1">
        <button
          type="button"
          className={`min-h-11 rounded-lg px-3 text-sm font-semibold ${isSignIn ? "bg-white shadow-sm" : "text-text-secondary"}`}
          aria-pressed={isSignIn}
          onClick={() => {
            setMode("sign-in");
            setError(null);
            setNotice(null);
          }}
        >
          {copy.signIn}
        </button>
        <button
          type="button"
          className={`min-h-11 rounded-lg px-3 text-sm font-semibold ${!isSignIn ? "bg-white shadow-sm" : "text-text-secondary"}`}
          aria-pressed={!isSignIn}
          onClick={() => {
            setMode("sign-up");
            setError(null);
            setNotice(null);
          }}
        >
          {copy.signUp}
        </button>
      </div>

      <form
        className="mt-5 space-y-4"
        onSubmit={isSignIn ? handleSignIn : handleSignUp}
      >
        {!isSignIn ? (
          <div>
            <label className="mb-2 block text-sm font-semibold" htmlFor="traveler-name">
              {copy.displayName}
            </label>
            <input
              id="traveler-name"
              name="name"
              required
              autoComplete="name"
              disabled={isLoading}
              className="min-h-12 w-full rounded-xl border border-border bg-white px-4 outline-none focus:border-primary focus:ring-3 focus:ring-blue-100"
            />
          </div>
        ) : null}

        <div>
          <label className="mb-2 block text-sm font-semibold" htmlFor="traveler-email">
            {copy.email}
          </label>
          <input
            id="traveler-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            disabled={isLoading}
            className="min-h-12 w-full rounded-xl border border-border bg-white px-4 outline-none focus:border-primary focus:ring-3 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold" htmlFor="traveler-password">
            {copy.password}
          </label>
          <input
            id="traveler-password"
            name="password"
            type="password"
            required
            minLength={12}
            maxLength={128}
            autoComplete={isSignIn ? "current-password" : "new-password"}
            disabled={isLoading}
            className="min-h-12 w-full rounded-xl border border-border bg-white px-4 outline-none focus:border-primary focus:ring-3 focus:ring-blue-100"
          />
        </div>

        {notice ? (
          <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800" role="status">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="button-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
        >
          {isSignIn ? <LogIn aria-hidden="true" size={18} /> : <UserPlus aria-hidden="true" size={18} />}
          {isLoading
            ? isSignIn
              ? copy.signingIn
              : copy.creatingAccount
            : isSignIn
              ? copy.signIn
              : copy.createAccount}
        </button>
      </form>
    </section>
  );
}
