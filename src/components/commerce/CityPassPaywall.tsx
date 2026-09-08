"use client";

import { Check, Headphones, LockKeyhole, X } from "lucide-react";
import Link from "next/link";
import posthog from "posthog-js";
import { useEffect, useState } from "react";

import { CommerceCheckoutButton } from "@/components/commerce/CommerceCheckoutButton";
import type { Locale } from "@/lib/i18n";
import type { CityPassCopy } from "@/lib/commerce/cityPassCopy";

export function CityPassPaywall({
  locale,
  copy,
  returnPath,
  signedIn,
  offer,
  initiallyOpen = false,
}: Readonly<{
  locale: Locale;
  copy: CityPassCopy;
  returnPath: string;
  signedIn: boolean;
  offer?: Readonly<{ priceId: number; formattedPrice: string; productSlug: string }>;
  initiallyOpen?: boolean;
}>) {
  const [open, setOpen] = useState(initiallyOpen);

  useEffect(() => {
    if (!open) return;
    capturePassEvent("paywall_viewed", {
      city_slug: "lubeck",
      feature_id: "hidden_lubeck_audio",
      placement: "place_detail",
      locale,
      pass_duration_hours: 72,
    });
  }, [locale, open]);

  function selectPremium() {
    capturePassEvent("premium_feature_selected", {
      city_slug: "lubeck",
      feature_id: "hidden_lubeck_audio",
      placement: "place_detail",
      locale,
    });
    setOpen(true);
  }

  return (
    <section id="premium-audio" className="mt-8 scroll-mt-6" lang={copy.actualLocale} dir={copy.actualLocale === "ar" ? "rtl" : "ltr"}>
      {!open ? (
        <button
          type="button"
          onClick={selectPremium}
          className="flex min-h-14 w-full items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-violet-700 to-blue-700 px-5 text-start font-semibold text-white shadow-sm transition hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
        >
          <span className="flex items-center gap-3">
            <Headphones aria-hidden="true" className="shrink-0" size={20} />
            <span>{copy.premiumLabel}</span>
          </span>
          <LockKeyhole aria-hidden="true" className="shrink-0" size={19} />
        </button>
      ) : (
        <div className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-blue-50 p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-700">CITYWALK PASS</p>
              <h2 className="mt-2 text-2xl font-bold leading-tight tracking-[-0.025em]">{copy.title}</h2>
            </div>
            <button type="button" aria-label={copy.close} onClick={() => setOpen(false)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-text-secondary transition hover:text-text-primary">
              <X aria-hidden="true" size={19} />
            </button>
          </div>
          <ul className="mt-5 space-y-3">
            {copy.benefits.map((benefit) => (
              <li className="flex items-start gap-2.5 text-sm leading-6 text-text-secondary" key={benefit}>
                <Check aria-hidden="true" className="mt-1 shrink-0 text-teal-600" size={16} />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
          {offer ? (
            signedIn ? (
              <CommerceCheckoutButton
                priceId={offer.priceId}
                locale={locale}
                label={copy.unlock.replace("{price}", offer.formattedPrice)}
                loadingLabel={copy.checkoutLoading}
                errorLabel={copy.checkoutError}
                analytics={{
                  city_slug: "lubeck",
                  feature_id: "hidden_lubeck_audio",
                  locale,
                  product_slug: offer.productSlug,
                  price_variant: String(offer.priceId),
                  pass_duration_hours: 72,
                }}
                resumePath={returnPath}
              />
            ) : (
              <Link className="button-primary mt-5 w-full" href={`/${locale}/account?next=${encodeURIComponent(returnPath)}`}>
                {copy.signInToUnlock}
              </Link>
            )
          ) : (
            <p className="mt-5 rounded-xl bg-white px-4 py-3 text-sm text-text-secondary">{copy.unavailable}</p>
          )}
          <button type="button" onClick={() => setOpen(false)} className="mt-3 min-h-11 w-full rounded-xl px-4 text-sm font-semibold text-text-secondary transition hover:bg-white">
            {copy.continueFree}
          </button>
          <p className="mt-4 text-xs leading-5 text-text-muted">{copy.trust}</p>
        </div>
      )}
    </section>
  );
}

function capturePassEvent(
  eventName: string,
  properties: Readonly<Record<string, string | number>>,
) {
  try {
    posthog.capture(eventName, properties);
  } catch {
    // Analytics remains optional and cannot block the guest experience.
  }
}
