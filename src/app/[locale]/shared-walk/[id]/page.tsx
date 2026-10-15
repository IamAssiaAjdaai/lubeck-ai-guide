import { notFound } from "next/navigation";
import { approvedStoreUrl, buildSharedWalkSchemeUrl } from "@/lib/nativeAppHandoff";
import { isEligibleTourPlace } from "@citywalk/traveler-core";
import { getSharedWalk, SharedWalkError } from "@/lib/sharing/sharedWalks.server";
import { getPublicCitySnapshot } from "@/lib/content/publicRepository.server";
import { prepareMapPlaces } from "@/lib/mapPlaces";
import { formatMessage, getTranslations, isLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function GuestWalkPage({ params }: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale) || !uuid.test(id)) notFound();

  let walk;
  try {
    walk = await getSharedWalk(id);
  } catch (error) {
    if (error instanceof SharedWalkError && error.status === 404) notFound();
    throw error;
  }

  const city = await getPublicCitySnapshot(walk.route.citySlug);
  const title = city.city.content[locale]?.name ?? city.city.content.en?.name ?? walk.route.citySlug;
  const translations = getTranslations(locale);
  const iosUrl = approvedStoreUrl(process.env.EXPO_PUBLIC_IOS_APP_STORE_URL);
  const androidUrl = approvedStoreUrl(process.env.EXPO_PUBLIC_ANDROID_PLAY_STORE_URL);
  const bySlug = new Map(
    prepareMapPlaces(
      city.places.filter(isEligibleTourPlace),
      locale,
      { getDetailHref: place => "/" + locale + "/" + walk.route.citySlug + "/" + place.slug },
    ).map(place => [place.slug, place] as const),
  );
  const stops = walk.route.stopSlugs.flatMap(slug => {
    const place = bySlug.get(slug);
    return place ? [{
      ...place,
      duration: formatMessage(translations.placeCatalog.placeDuration, {
        minutes: new Intl.NumberFormat(locale).format(place.durationMinutes),
      }),
    }] : [];
  });
  // A removed, unpublished or ineligible stop must never silently shorten a shared route.
  if (stops.length !== walk.route.stopSlugs.length) notFound();

  return (
    <main className="mx-auto max-w-2xl px-5 py-12" lang={locale}>
      <p className="text-sm font-semibold tracking-wider uppercase">CITYWALK · Shared Walk</p>
      <h1 className="mt-4 text-3xl font-semibold">{title}</h1>
      <p className="mt-3 text-base opacity-75">
        A shared route with {stops.length} stops · planned for {walk.route.settings.minutes} min
      </p>
      <h2 className="mt-8 text-xl font-semibold">Your route</h2>
      <ol className="mt-4 space-y-3">
        {stops.map((stop, index) => (
          <li key={stop.slug} className="rounded-xl border px-4 py-3">
            <span className="mr-3 font-semibold">{index + 1}.</span>{stop.name}
          </li>
        ))}
      </ol>
      <section className="mt-8 space-y-4" aria-label="Open shared walk in CITYWALK">
        <h2 className="text-xl font-semibold">Start this walk in the CITYWALK app</h2>
        <p className="opacity-75">Your friend shared this exact route. Open it in CITYWALK to preview and walk the same ordered stops — no account needed.</p>
        <div className="flex flex-wrap gap-3">
          <a href={buildSharedWalkSchemeUrl(id)} className="button-primary inline-flex min-h-12 items-center justify-center px-6">Open CITYWALK</a>
          {iosUrl ? <a href={iosUrl} className="button-secondary inline-flex min-h-12 items-center justify-center px-6" rel="noreferrer">Download for iPhone</a> : null}
          {androidUrl ? <a href={androidUrl} className="button-secondary inline-flex min-h-12 items-center justify-center px-6" rel="noreferrer">Download for Android</a> : null}
        </div>
        {!iosUrl && !androidUrl ? <p className="text-sm opacity-70">Download links will appear when the official CITYWALK store listings are ready.</p> : null}
      </section>
    </main>
  );
}
