"use client";

import { KeyRound, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { adminAuthClient } from "@/lib/admin/authClient";

const GENERIC_LOGIN_ERROR =
  "Sign-in failed. Check your details and try again.";
const PASSKEY_LOGIN_ERROR =
  "Passkey sign-in was cancelled or no matching passkey was available.";

export function AdminLoginForm() {
  const router = useRouter();
  const [activeAction, setActiveAction] = useState<"passkey" | "password" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finishSignIn() {
    router.replace("/admin");
    router.refresh();
  }

  async function handlePasskeySignIn() {
    setError(null);

    if (
      typeof window === "undefined" ||
      typeof window.PublicKeyCredential === "undefined"
    ) {
      setError("Passkeys are not supported in this browser. Use password instead.");
      setShowPassword(true);
      return;
    }

    setActiveAction("passkey");
    try {
      const result = await adminAuthClient.signIn.passkey();
      if (result.error) {
        setError(PASSKEY_LOGIN_ERROR);
        return;
      }
      await finishSignIn();
    } catch {
      setError(PASSKEY_LOGIN_ERROR);
    } finally {
      setActiveAction(null);
    }
  }

  async function handlePasswordSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActiveAction("password");
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const result = await adminAuthClient.signIn.email({ email, password });

      if (result.error) {
        setError(GENERIC_LOGIN_ERROR);
        return;
      }

      const data = result.data as { twoFactorRedirect?: boolean } | null;
      if (data?.twoFactorRedirect) {
        return;
      }

      await finishSignIn();
    } catch {
      setError(GENERIC_LOGIN_ERROR);
    } finally {
      setActiveAction(null);
    }
  }

  const isLoading = activeAction !== null;

  return (
    <div className="mt-8">
      <button
        className="button-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isLoading}
        onClick={() => void handlePasskeySignIn()}
        type="button"
      >
        <KeyRound aria-hidden="true" size={19} />
        {activeAction === "passkey" ? "Checking passkey…" : "Continue with passkey"}
      </button>

      <p className="mt-3 text-center text-xs leading-5 text-text-secondary">
        Recommended for CITYWALK staff. Use Touch ID, Face ID, your device PIN,
        password manager, or a compatible security key.
      </p>

      {error ? (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <button
        className="mt-5 w-full text-sm font-bold text-primary underline-offset-4 hover:underline"
        disabled={isLoading}
        onClick={() => {
          setShowPassword((value) => !value);
          setError(null);
        }}
        type="button"
      >
        {showPassword ? "Hide password sign-in" : "Use password instead"}
      </button>

      {showPassword ? (
        <form className="mt-5 space-y-5 border-t border-border pt-5" onSubmit={handlePasswordSignIn}>
          <p className="text-xs leading-5 text-text-secondary">
            Password is the recovery fallback. If TOTP is enabled, you will be
            asked for your authenticator code next.
          </p>
          <div>
            <label
              className="mb-2 block text-sm font-semibold text-text-primary"
              htmlFor="admin-email"
            >
              Email
            </label>
            <input
              autoComplete="username webauthn"
              className="min-h-12 w-full rounded-xl border border-border bg-white px-4 text-base shadow-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-blue-100"
              disabled={isLoading}
              id="admin-email"
              name="email"
              required
              type="email"
            />
          </div>
          <div>
            <label
              className="mb-2 block text-sm font-semibold text-text-primary"
              htmlFor="admin-password"
            >
              Password
            </label>
            <input
              autoComplete="current-password webauthn"
              className="min-h-12 w-full rounded-xl border border-border bg-white px-4 text-base shadow-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-blue-100"
              disabled={isLoading}
              id="admin-password"
              minLength={12}
              name="password"
              required
              type="password"
            />
          </div>
          <button
            className="button-secondary w-full disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            type="submit"
          >
            <LogIn aria-hidden="true" size={19} />
            {activeAction === "password" ? "Signing in…" : "Sign in with password"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
