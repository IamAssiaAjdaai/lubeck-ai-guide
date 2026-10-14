import { notFound } from "next/navigation";
import { getSharedWalk, SharedWalkError } from "@/lib/sharing/sharedWalks.server";
import { getPublicCitySnapshot } from "@/lib/content/publicRepository.server";
import { isLocale, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function GuestWalkPage({ params }: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale) || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)) notFound();
  let walk;
  try {
    walk = await getSharedWalk(id);
  } catch (error) {
    if (error instanceof SharedWalkError && error.status === 404) notFound();
    throw error;
  }
  const city = await getPublicCitySnapshot(walk.route.citySlug);
  const lang = locale as Locale;
  const title = city.city.content[lang]?.name ?? city.city.content.en?.name ?? walk.route.citySlug;
  const bySlug = new Map(city.places.map(place => [place.slug, place]));
  const stops = walk.route.stopSlugs.map(slug => {
    const place = bySlug.get(slug);
    return place && {
      slug,
      name: place.content[lang]?.name ?? place.content.en?.name ?? slug,
    };
  });
  if (stops.some(stop => !stop)) notFound();

  return (
    <main className="mx-auto max-w-2xl px-5 py-12" lang={locale}>
      <p className="text-sm font-semibold tracking-wider uppercase">CITYWALK · Shared Walk</p>
      <h1 className="mt-4 text-3xl font-semibold">{title}</h1>
      <p className="mt-3 text-base opacity-75">
        A shared route with {stops.length} stops · approximately {walk.route.settings.minutes} min
      </p>
      <h2 className="mt-8 text-xl font-semibold">Your route</h2>
      <ol className="mt-4 space-y-3">
        {stops.map((stop, index) => (
          <li key={stop!.slug} className="rounded-xl border px-4 py-3">
            <span className="mr-3 font-semibold">{index + 1}.</span>{stop!.name}
          </li>
        ))}
      </ol>
      <p className="mt-8 text-sm opacity-70">
        You can view this route without an account. Guest start and app-opening links are coming in the next iteration.
      </p>
    </main>
  );
}
