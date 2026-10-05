import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { CitywalkLogo } from "@/components/brand/CitywalkLogo";
import MarketingLandingTracker from "@/components/marketing/MarketingLandingTracker";
import {
  appendMarketingAttributionToPath,
  readMarketingAttribution,
} from "@/lib/marketingAttribution";
import { getPublishedMarketingPageByPath } from "@/lib/marketing/publicRepository.server";

type MarketingPageProps = Readonly<{
  params: Promise<{
    marketingSlug: string;
  }>;
  searchParams?: Promise<
    Readonly<Record<string, string | string[] | undefined>>
  >;
}>;

export async function generateMetadata({
  params,
}: MarketingPageProps): Promise<Metadata> {
  const { marketingSlug } = await params;
  const page = await loadPage(marketingSlug);

  if (!page) return {};

  const title = page.seoTitle ?? page.title;
  const description = page.seoDescription;
  const canonicalUrl = `https://getcitywalk.com${page.path}`;

  return {
    title,
    ...(description ? { description } : {}),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      ...(description ? { description } : {}),
      url: canonicalUrl,
      siteName: "CITYWALK",
      type: page.kind === "blog" ? "article" : "website",
    },
  };
}

export default async function MarketingPage({
  params,
  searchParams,
}: MarketingPageProps) {
  const { marketingSlug } = await params;
  const page = await loadPage(marketingSlug);

  if (!page || page.city.slug !== "lubeck") notFound();

  const attribution = readMarketingAttribution((await searchParams) ?? {});
  const plannerHref = appendMarketingAttributionToPath(
    "/en/lubeck",
    attribution,
  );
  const bodyParagraphs = page.body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <main className="min-h-screen bg-white text-text-primary">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-6 sm:px-8 sm:py-8">
        <header className="flex items-center justify-between">
          <Link href="/" aria-label="CITYWALK home" className="text-text-primary">
            <CitywalkLogo
              className="inline-flex items-center gap-2"
              markClassName="h-7 w-12 text-accent"
              wordmarkClassName="text-sm font-bold tracking-[0.16em]"
            />
          </Link>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            {page.city.name}
          </span>
        </header>

        <section className="flex flex-1 items-center py-14 sm:py-20">
          <div className="max-w-3xl">
            <p className="eyebrow">Explore more. Plan less.</p>
            <h1 className="mt-4 text-[clamp(2.5rem,8vw,5.5rem)] font-bold leading-[0.96] tracking-[-0.055em]">
              {page.title}
            </h1>

            <div className="mt-7 max-w-2xl space-y-4 text-lg leading-8 text-text-secondary">
              {bodyParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <div className="mt-8">
              <MarketingLandingTracker
                city={page.city.slug}
                landingVariant={page.slug}
                campaignSlug={page.campaign?.slug}
                attribution={attribution}
                ctaHref={page.cta ? plannerHref : undefined}
                ctaLabel={page.cta}
              />
            </div>

            <p className="mt-5 text-sm text-text-muted">
              Tell CITYWALK how much time you have. It builds the walk for you.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

async function loadPage(marketingSlug: string) {
  await connection();
  return getPublishedMarketingPageByPath(`/lubeck/${marketingSlug}`);
}
