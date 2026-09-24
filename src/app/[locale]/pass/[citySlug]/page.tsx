import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { CityPassPaywall } from "@/components/commerce/CityPassPaywall";
import { getAuth } from "@/lib/auth/server";
import { getCityPassAccessState } from "@/lib/commerce/cityPassAccess.server";
import { getCityPassConfiguration, getCityPassPaywallContext } from "@/lib/commerce/cityPassConfig";
import { getCityPassCopy } from "@/lib/commerce/cityPassCopy";
import { createCityPassLandingPath } from "@/lib/commerce/cityPassReturn";
import { formatMinorCurrency, getActiveCityPassOffer } from "@/lib/commerce/queries.server";
import { isLocale } from "@/lib/i18n";

export default async function CityPassLandingPage({
  params,
}: Readonly<{ params: Promise<{ locale: string; citySlug: string }> }>) {
  const { locale, citySlug } = await params;
  if (!isLocale(locale)) notFound();
  const configuration = getCityPassConfiguration(citySlug);
  if (!configuration) notFound();

  await connection();
  const session = await getAuth().api.getSession({ headers: await headers() });
  const access = await getCityPassAccessState({ userId: session?.user.id, citySlug });
  const offer = access.active ? undefined : await getActiveCityPassOffer(citySlug);
  const copy = getCityPassCopy(configuration, locale);
  const returnPath = createCityPassLandingPath(locale, citySlug);

  return (
    <main className="mx-auto max-w-xl px-5 py-8" dir={copy.actualLocale === "ar" ? "rtl" : "ltr"} lang={copy.actualLocale}>
      <Link className="text-sm font-semibold text-text-secondary underline" href={`/${locale}/${citySlug}`}>
        {copy.continueFree}
      </Link>
      {access.active ? (
        <div className="mt-8 rounded-3xl border border-violet-200 bg-violet-50 p-6">
          <h1 className="text-2xl font-bold">CITYWALK PASS</h1>
          <p className="mt-3 text-text-secondary">{copy.continuePremium}</p>
          <Link className="button-primary mt-5 w-full" href={`/${locale}/${citySlug}`}>
            {copy.continuePremium}
          </Link>
        </div>
      ) : (
        <CityPassPaywall
          locale={locale}
          copy={copy}
          pass={{
            ...getCityPassPaywallContext(configuration),
            featureId: "verified_ai_guide",
            placement: "native_guide_limit",
          }}
          returnPath={returnPath}
          signedIn={Boolean(session)}
          offer={offer ? {
            priceId: offer.priceId,
            productSlug: offer.productSlug,
            formattedPrice: formatMinorCurrency(offer.unitAmount, offer.currency, locale),
          } : undefined}
          initiallyOpen
        />
      )}
    </main>
  );
}
