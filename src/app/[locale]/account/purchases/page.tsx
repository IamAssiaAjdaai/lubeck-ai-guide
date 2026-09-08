import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { CommerceCheckoutButton } from "@/components/commerce/CommerceCheckoutButton";
import { CheckoutReturnTracker } from "@/components/commerce/CheckoutReturnTracker";
import { auth } from "@/lib/auth/server";
import { getCommerceCopy } from "@/lib/commerce/copy";
import {
  formatMinorCurrency,
  listActiveCommerceOffers,
  listUserCommerceState,
} from "@/lib/commerce/queries.server";
import { getDirection, isLocale } from "@/lib/i18n";
import {
  getCityPassAccessState,
  LUBECK_CITY_PASS_PRODUCT_SLUG,
} from "@/lib/commerce/cityPassAccess.server";
import { getCityPassCopy } from "@/lib/commerce/cityPassCopy";

export default async function PurchasesPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ checkout?: string | string[] }>;
}>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(
      `/${locale}/account?next=${encodeURIComponent(`/${locale}/account/purchases`)}`,
    );
  }

  const copy = getCommerceCopy(locale);
  const direction = getDirection(locale);
  const BackIcon = direction === "rtl" ? ArrowRight : ArrowLeft;
  const checkoutValue = (await searchParams).checkout;
  const checkout = Array.isArray(checkoutValue) ? checkoutValue[0] : checkoutValue;
  const [allOffers, state, cityPassAccess] = await Promise.all([
    listActiveCommerceOffers(),
    listUserCommerceState(session.user.id),
    getCityPassAccessState({ userId: session.user.id, citySlug: "lubeck" }),
  ]);
  const offers = cityPassAccess.active
    ? allOffers.filter(
        ({ productSlug }) => productSlug !== LUBECK_CITY_PASS_PRODUCT_SLUG,
      )
    : allOffers;
  const cityPassCopy = getCityPassCopy(locale);

  return (
    <main lang={locale} dir={direction} className="app-shell">
      <section className="content-container py-8 sm:py-12">
        {checkout === "success" || checkout === "canceled" ? (
          <CheckoutReturnTracker
            outcome={checkout}
            locale={locale}
            accessActive={cityPassAccess.active}
            returnLabel={cityPassCopy.continuePremium}
          />
        ) : null}
        <Link
          href={`/${locale}/account`}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-white px-4 text-sm font-semibold text-text-secondary transition hover:border-blue-200 hover:text-primary"
        >
          <BackIcon aria-hidden="true" size={18} strokeWidth={1.8} />
          {copy.backToAccount}
        </Link>

        <header className="mt-7">
          <h1 className="text-[2rem] font-bold leading-tight tracking-[-0.03em]">
            {copy.title}
          </h1>
          <p className="mt-3 text-[15px] leading-6 text-text-secondary">
            {copy.description}
          </p>
        </header>

        {checkout === "success" ? (
          <p className="mt-5 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800" role="status">
            {copy.checkoutPendingMessage}
          </p>
        ) : null}
        {checkout === "canceled" ? (
          <p className="mt-5 rounded-xl bg-surface px-4 py-3 text-sm text-text-secondary" role="status">
            {copy.checkoutCanceledMessage}
          </p>
        ) : null}

        <section className="mt-8">
          <h2 className="text-xl font-semibold">{copy.availableProducts}</h2>
          {offers.length === 0 ? (
            <p className="surface-card mt-4 p-5 text-sm text-text-secondary">
              {copy.noProducts}
            </p>
          ) : (
            <div className="mt-4 grid gap-4">
              {offers.map((offer) => (
                <article className="surface-card p-5" key={offer.priceId}>
                  <p className="text-lg font-semibold">{offer.productName}</p>
                  {offer.description ? (
                    <p className="mt-2 text-sm leading-6 text-text-secondary">
                      {offer.description}
                    </p>
                  ) : null}
                  <p className="mt-3 text-xl font-bold">
                    {formatMinorCurrency(
                      offer.unitAmount,
                      offer.currency,
                      locale,
                    )}
                  </p>
                  <CommerceCheckoutButton
                    priceId={offer.priceId}
                    locale={locale}
                    label={copy.continueCheckout}
                    loadingLabel={copy.startingCheckout}
                    errorLabel={copy.checkoutError}
                  />
                  <p className="mt-3 flex items-center gap-2 text-xs text-text-muted">
                    <ShieldCheck aria-hidden="true" size={15} />
                    {copy.secureCheckoutNote}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        {cityPassAccess.active ? (
          <section className="mt-8 rounded-2xl border border-violet-200 bg-violet-50 p-5" lang={cityPassCopy.actualLocale} dir={cityPassCopy.actualLocale === "ar" ? "rtl" : "ltr"}>
            <p className="font-semibold">
              {cityPassAccess.expiresAt
                ? cityPassCopy.activeUntil.replace(
                    "{date}",
                    new Intl.DateTimeFormat(locale, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(cityPassAccess.expiresAt),
                  )
                : cityPassCopy.continuePremium}
            </p>
            <Link className="button-primary mt-4 w-full" href={`/${locale}/lubeck`}>
              {cityPassCopy.continuePremium}
            </Link>
          </section>
        ) : null}

        <section className="mt-9">
          <h2 className="text-xl font-semibold">{copy.currentAccess}</h2>
          {state.entitlements.length === 0 ? (
            <p className="surface-card mt-4 p-5 text-sm text-text-secondary">
              {copy.noAccess}
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {state.entitlements.map((entitlement) => (
                <article className="surface-card p-4" key={entitlement.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{entitlement.productName}</p>
                    <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                      {entitlement.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-text-secondary">
                    {entitlement.scopeType}: {entitlement.scopeKey}
                  </p>
                  {entitlement.expiresAt ? (
                    <p className="mt-1 text-xs text-text-muted">
                      {copy.expires}: {entitlement.expiresAt.toLocaleDateString(locale)}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-9">
          <h2 className="text-xl font-semibold">{copy.currentPurchases}</h2>
          {state.orders.length === 0 ? (
            <p className="surface-card mt-4 p-5 text-sm text-text-secondary">
              {copy.noPurchases}
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {state.orders.map((order) => (
                <article className="surface-card p-4" key={order.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{order.productName}</p>
                    <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                      {order.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-text-secondary">
                    {formatMinorCurrency(order.amountTotal, order.currency, locale)}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {order.createdAt.toLocaleDateString(locale)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
