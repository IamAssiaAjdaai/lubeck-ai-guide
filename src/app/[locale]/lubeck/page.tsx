import Link from "next/link";
import { notFound } from "next/navigation";
import { landmarks } from "@/data/landmarks";
import {
  locales,
  translations,
  type Locale,
} from "@/data/translations";

type LubeckPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function LubeckPage({
  params,
}: LubeckPageProps) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const currentLocale = locale as Locale;
  const t = translations[currentLocale];
  const isArabic = currentLocale === "ar";

  return (
    <main
      dir={isArabic ? "rtl" : "ltr"}
      className="min-h-screen bg-white text-black"
    >
      <section className="mx-auto w-full max-w-md px-6 py-10">
        {/* Back */}
        <Link
          href="/"
          className="text-sm font-medium text-zinc-500 hover:text-black"
        >
          {isArabic ? "→" : "←"} {t.back}
        </Link>

        {/* Header */}
        <h1 className="mt-6 text-3xl font-bold tracking-tight">
          {t.discover}
        </h1>

        <p className="mt-2 text-zinc-600">
          {t.places}
        </p>

        {/* Walking Tour */}
        <div className="mt-8 rounded-2xl bg-zinc-100 p-5">
          <p className="text-sm font-medium text-zinc-500">
            {currentLocale === "de"
              ? "Stadtrundgang"
              : currentLocale === "fr"
                ? "Visite à pied"
                : currentLocale === "ar"
                  ? "جولة سيراً على الأقدام"
                  : "Walking Tour"}
          </p>

          <h2 className="mt-1 text-xl font-semibold">
            {currentLocale === "de"
              ? "Historisches Zentrum von Lübeck"
              : currentLocale === "fr"
                ? "Centre historique de Lübeck"
                : currentLocale === "ar"
                  ? "المركز التاريخي لمدينة لوبيك"
                  : "Lübeck Historic Center"}
          </h2>

          <p className="mt-2 text-sm text-zinc-600">
            ~45 min • 5 stops
          </p>

          <Link
            href={`/${currentLocale}/lubeck/holstentor`}
            className="mt-5 flex h-14 items-center justify-center rounded-xl bg-black font-semibold text-white transition hover:bg-zinc-800"
          >
            {t.startTour}
          </Link>
        </div>

        {/* Places */}
        <div className="mt-10">
          <h2 className="text-lg font-semibold">
            {currentLocale === "de"
              ? "Orte"
              : currentLocale === "fr"
                ? "Lieux"
                : currentLocale === "ar"
                  ? "الأماكن"
                  : "Places"}
          </h2>

          <div className="mt-4 flex flex-col gap-4">
            {landmarks.map((landmark) => {
              const localizedContent =
                "content" in landmark
                  ? landmark.content[currentLocale]
                  : null;

              const name =
                localizedContent?.name ??
                ("name" in landmark
                  ? landmark.name
                  : landmark.slug);

              const duration =
                localizedContent?.duration ??
                ("duration" in landmark
                  ? landmark.duration
                  : "");

              return (
                <Link
                  key={landmark.slug}
                  href={`/${currentLocale}/lubeck/${landmark.slug}`}
                  className="flex items-center gap-4 rounded-2xl border border-zinc-200 p-3 transition hover:bg-zinc-50"
                >
                  {/* Image placeholder */}
                  <div className="h-20 w-20 shrink-0 rounded-xl bg-zinc-200" />

                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">
                      {name}
                    </h3>

                    <p className="mt-1 text-sm text-zinc-500">
                      🎧 {duration}
                    </p>
                  </div>

                  <span className="text-xl text-zinc-400">
                    {isArabic ? "←" : "→"}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}