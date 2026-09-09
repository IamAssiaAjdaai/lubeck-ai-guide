"use client";

import { CreditCard } from "lucide-react";
import { useState } from "react";
import posthog from "posthog-js";
import { CITY_PASS_RETURN_STORAGE_KEY } from "@/lib/commerce/cityPassReturn";

export function CommerceCheckoutButton({
  priceId,
  locale,
  label,
  loadingLabel,
  errorLabel,
  analytics,
  resumePath,
}: Readonly<{
  priceId: number;
  locale: string;
  label: string;
  loadingLabel: string;
  errorLabel: string;
  analytics?: Readonly<Record<string, string | number>>;
  resumePath?: string;
}>) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setIsLoading(true);
    setError(null);
    try {
      if (resumePath) {
        try {
          window.sessionStorage.setItem(
            CITY_PASS_RETURN_STORAGE_KEY,
            resumePath,
          );
        } catch {
          // Storage is only a navigation convenience, never access authority.
        }
      }
      const response = await fetch("/api/commerce/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, locale }),
      });
      if (!response.ok) throw new Error("checkout failed");
      const data = (await response.json()) as { checkoutUrl?: string };
      if (!data.checkoutUrl) throw new Error("checkout missing url");
      if (analytics) {
        try {
          posthog.capture("checkout_started", analytics);
        } catch {
          // Analytics must never block the verified hosted checkout.
        }
      }
      window.location.assign(data.checkoutUrl);
    } catch {
      setError(errorLabel);
      setIsLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        className="button-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isLoading}
        onClick={() => void startCheckout()}
      >
        <CreditCard aria-hidden="true" size={18} />
        {isLoading ? loadingLabel : label}
      </button>
      {error ? (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
