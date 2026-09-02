import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheckBig, House, RotateCcw } from "lucide-react";
import TourCompletionTracker from "@/components/TourCompletionTracker";
import { cities } from "@/data/cities";

import {
  getDirection,
  getTranslations,
  isLocale,
  locales,
} from "@/lib/i18n";

type CompletePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function CompletePage({
  params,
}: CompletePageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const currentLocale = locale;
  const direction = getDirection(currentLocale);
  const content = getTranslations(currentLocale).complete;
  const common = getTranslations(currentLocale).common;
  const city = cities.lubeck;

  return (
    <main
      lang={currentLocale}
      dir={direction}
      className="app-shell"
    >
      <section className="content-container flex min-h-screen flex-col justify-center py-10">
        <div className="text-center">
          {/* Success icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success">
            <CircleCheckBig aria-hidden="true" size={32} strokeWidth={1.75} />
          </div>

          <p className="eyebrow mt-5">
            {content.badge}
          </p>

          <h1 className="mt-3 text-[2rem] font-bold leading-tight tracking-[-0.03em]">
            {content.title}
          </h1>

          <p className="mx-auto mt-3 max-w-sm leading-7 text-text-secondary">
            {content.description}
          </p>
        </div>

        {/* Statistics */}
        <div className="mt-8 grid grid-cols-3 gap-2.5">
          <div className="surface-card px-2 py-4 text-center"><p className="text-xl font-bold tabular-nums">{city.landmarkCount}/{city.landmarkCount}</p><p className="mt-1 text-xs text-text-secondary">{content.statsStops}</p></div>
          <div className="surface-card px-2 py-4 text-center"><p className="text-xl font-bold tabular-nums text-success">100%</p><p className="mt-1 text-xs text-text-secondary">{content.statsComplete}</p></div>
          <div className="surface-card px-2 py-4 text-center"><p className="text-xl font-bold tabular-nums">~{city.estimatedMinutes}</p><p className="mt-1 text-xs text-text-secondary">{content.statsMinutes}</p></div>
        </div>

        {/* Rating */}
        <TourCompletionTracker
            city="lubeck"
            locale={currentLocale}
            totalStops={5}
            ratingQuestion={content.ratingQuestion}
            thankYou={content.thankYou}
            starRating={common.starRating}
        />

        {/* Restart */}
        <Link
          href={`/${currentLocale}/lubeck`}
          className="button-primary mt-7 w-full"
        >
          <RotateCcw aria-hidden="true" size={18} strokeWidth={1.8} /> {content.restart}
        </Link>

        {/* Home */}
        <Link
          href="/"
          className="button-tertiary mt-2 w-full text-sm"
        >
          <House aria-hidden="true" size={18} strokeWidth={1.8} /> {content.home}
        </Link>
      </section>
    </main>
  );
}
