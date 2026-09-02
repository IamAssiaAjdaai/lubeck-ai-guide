import Link from "next/link";
import { notFound } from "next/navigation";
import TourCompletionTracker from "@/components/TourCompletionTracker";

import {
  locales,
  type Locale,
} from "@/data/translations";

type CompletePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function CompletePage({
  params,
}: CompletePageProps) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const currentLocale = locale as Locale;
  const isArabic = currentLocale === "ar";

  const content = {
    en: {
      badge: "Tour complete",
      title: "You explored Lübeck!",
      description:
        "You completed 5 historic stops in Lübeck's old town.",
      progress: "5 of 5 stops completed",
      rating: "How was your tour?",
      feedback: "Share feedback",
      restart: "Explore again",
      home: "Back to home",
    },

    de: {
      badge: "Tour abgeschlossen",
      title: "Du hast Lübeck entdeckt!",
      description:
        "Du hast 5 historische Stationen in der Lübecker Altstadt besucht.",
      progress: "5 von 5 Stopps abgeschlossen",
      rating: "Wie hat dir die Tour gefallen?",
      feedback: "Feedback geben",
      restart: "Noch einmal entdecken",
      home: "Zur Startseite",
    },

    fr: {
      badge: "Visite terminée",
      title: "Vous avez découvert Lübeck !",
      description:
        "Vous avez terminé les 5 étapes historiques de la vieille ville.",
      progress: "5 étapes sur 5 terminées",
      rating: "Comment était votre visite ?",
      feedback: "Donner votre avis",
      restart: "Explorer à nouveau",
      home: "Retour à l'accueil",
    },

    ar: {
      badge: "اكتملت الجولة",
      title: "لقد اكتشفت لوبيك!",
      description:
        "أكملت 5 محطات تاريخية في المدينة القديمة في لوبيك.",
      progress: "تم إكمال 5 من 5 محطات",
      rating: "كيف كانت جولتك؟",
      feedback: "أرسل رأيك",
      restart: "استكشف مرة أخرى",
      home: "العودة إلى البداية",
    },
  }[currentLocale];

  return (
    <main
      dir={isArabic ? "rtl" : "ltr"}
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