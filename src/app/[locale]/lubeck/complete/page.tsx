import Link from "next/link";
import { notFound } from "next/navigation";
import TourCompletionTracker from "@/components/TourCompletionTracker";

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

  return (
    <main
      lang={currentLocale}
      dir={direction}
      className="min-h-screen bg-white text-black"
    >
      <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
        <div className="text-center">
          {/* Success icon */}
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100 text-3xl">
            ✓
          </div>

          <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            {content.badge}
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            {content.title}
          </h1>

          <p className="mx-auto mt-4 max-w-sm leading-7 text-zinc-600">
            {content.description}
          </p>
        </div>

        {/* Progress */}
        <div className="mt-10 rounded-2xl bg-zinc-100 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {content.progress}
            </span>

            <span className="font-bold">
              100%
            </span>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-300">
            <div className="h-full w-full rounded-full bg-black" />
          </div>
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

        {/* Feedback */}
        <button
          type="button"
          className="mt-8 flex h-14 items-center justify-center rounded-xl border border-black px-5 font-semibold transition hover:bg-zinc-50"
        >
          {content.feedback}
        </button>

        {/* Restart */}
        <Link
          href={`/${currentLocale}/lubeck`}
          className="mt-4 flex h-14 items-center justify-center rounded-xl bg-black px-5 font-semibold text-white transition hover:bg-zinc-800"
        >
          {content.restart}
        </Link>

        {/* Home */}
        <Link
          href="/"
          className="mt-5 text-center text-sm font-medium text-zinc-500 transition hover:text-black"
        >
          {content.home}
        </Link>
      </section>
    </main>
  );
}
