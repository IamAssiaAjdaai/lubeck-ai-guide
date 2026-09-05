"use client";

import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { authClient } from "@/lib/auth/client";

const GENERIC_LOGIN_ERROR =
  "Sign-in failed. Check your details and try again.";

export function AdminLoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const result = await authClient.signIn.email({ email, password });

      if (result.error) {
        setError(GENERIC_LOGIN_ERROR);
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError(GENERIC_LOGIN_ERROR);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
      <div>
        <label
          className="mb-2 block text-sm font-semibold text-text-primary"
          htmlFor="admin-email"
        >
          Email
        </label>
        <input
          autoComplete="username"
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
          autoComplete="current-password"
          className="min-h-12 w-full rounded-xl border border-border bg-white px-4 text-base shadow-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-blue-100"
          disabled={isLoading}
          id="admin-password"
          minLength={12}
          name="password"
          required
          type="password"
        />
      </div>
      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <button
        className="button-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isLoading}
        type="submit"
      >
        <LogIn aria-hidden="true" size={19} />
        {isLoading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
