"use client";

import { CreditCard } from "lucide-react";
import { useState } from "react";

export function CommerceCheckoutButton({
  priceId,
  locale,
  label,
  loadingLabel,
  errorLabel,
}: Readonly<{
  priceId: number;
  locale: string;
  label: string;
  loadingLabel: string;
  errorLabel: string;
}>) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/commerce/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, locale }),
      });
      if (!response.ok) throw new Error("checkout failed");
      const data = (await response.json()) as { checkoutUrl?: string };
      if (!data.checkoutUrl) throw new Error("checkout missing url");
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
