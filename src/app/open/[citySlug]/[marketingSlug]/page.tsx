import Link from "next/link";
import { notFound } from "next/navigation";

import { CitywalkLogo } from "@/components/brand/CitywalkLogo";
import { NativeAppFallback } from "@/components/marketing/NativeAppFallback";
import { readMarketingAttribution } from "@/lib/marketingAttribution";
import {
  approvedStoreUrl,
  buildCitywalkSchemeUrl,
} from "@/lib/nativeAppHandoff";

export const metadata = {
  title: "Open CITYWALK",
  robots: { index: false, follow: false },
};

type OpenAppPageProps = Readonly<{
  params: Promise<{ citySlug: string; marketingSlug: string }>;
  searchParams?: Promise<Readonly<Record<string, string | string[] | undefined>>>;
}>;

export default async function OpenAppPage({ params, searchParams }: OpenAppPageProps) {
  const { citySlug, marketingSlug } = await params;
  if (!isSafeSegment(citySlug) || !isSafeSegment(marketingSlug)) notFound();

  const attribution = readMarketingAttribution((await searchParams) ?? {});
  const schemeHref = buildCitywalkSchemeUrl({
    citySlug,
    marketingSlug,
    attribution,
  });
  const iosStoreUrl = approvedStoreUrl(process.env.CITYWALK_IOS_APP_STORE_URL);
  const androidStoreUrl = approvedStoreUrl(process.env.CITYWALK_ANDROID_PLAY_STORE_URL);

  return (
    <main className="min-h-screen bg-white text-text-primary">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 py-6 sm:px-8 sm:py-8">
        <header className="flex items-center justify-between">
          <Link href="/" aria-label="CITYWALK home" className="text-text-primary">
            <CitywalkLogo
              className="inline-flex items-center gap-2"
              markClassName="h-7 w-12 text-accent"
              wordmarkClassName="text-sm font-bold tracking-[0.16em]"
            />
          </Link>
        </header>

        <section className="flex flex-1 items-center py-14 sm:py-20">
          <div className="max-w-2xl">
            <p className="eyebrow">Continue in the app</p>
            <h1 className="mt-4 text-[clamp(2.5rem,8vw,5rem)] font-bold leading-[0.98] tracking-[-0.055em]">
              Open CITYWALK and build your walk.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-text-secondary">
              If CITYWALK is installed, your phone should open it automatically. Otherwise use the button below. Official store buttons appear here only after the public listings are configured.
            </p>

            <NativeAppFallback
              schemeHref={schemeHref}
              iosStoreUrl={iosStoreUrl}
              androidStoreUrl={androidStoreUrl}
            />

            <p className="mt-5 text-sm text-text-muted">
              Your campaign attribution stays attached to this handoff so CITYWALK can measure the full journey without changing your walk content.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function isSafeSegment(value: string): boolean {
  return /^[a-z0-9-]+$/.test(value);
}
