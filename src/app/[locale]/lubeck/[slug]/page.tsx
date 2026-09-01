import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import AudioPlayer from "@/components/AudioPlayer";
import { landmarks } from "@/data/landmarks";
import {
  locales,
  translations,
  type Locale,
} from "@/data/translations";

type LandmarkPageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    landmarks.map((landmark) => ({
      locale,
      slug: landmark.slug,
    }))
  );
}

export default async function LandmarkPage({
  params,
}: LandmarkPageProps) {
  const { locale, slug } = await params;

  // Check language
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const currentLocale = locale as Locale;
  const t = translations[currentLocale];

  const currentIndex = landmarks.findIndex(
    (landmark) => landmark.slug === slug
  );

  // Check landmark
  if (currentIndex === -1) {
    notFound();
  }

  const landmark = landmarks[currentIndex];
  const nextLandmark = landmarks[currentIndex + 1];

  const isArabic = currentLocale === "ar";

  const progress =
    ((currentIndex + 1) / landmarks.length) * 100;

  /*
   * Some landmarks still use the old structure.
   * Holstentor already has multilingual content.
   * These fallbacks let both structures work for now.
   */
  const localizedContent =
    "content" in landmark
      ? landmark.content[currentLocale]
      : null;

  const getText = (value: unknown): string =>
    typeof value === "string" ? value : "";

  const name =
    getText(localizedContent?.name) ||
    ("name" in landmark ? getText(landmark.name) : landmark.slug);

  const duration =
    getText(localizedContent?.duration) ||
    ("duration" in landmark ? getText(landmark.duration) : "");

  const description =
    getText(localizedContent?.description) ||
    ("description" in landmark ? getText(landmark.description) : "");

  const story =
    getText(localizedContent?.story) ||
    ("story" in landmark ? getText(landmark.story) : "");

  const audio =
    getText(localizedContent?.audio) ||
    ("audio" in landmark ? getText(landmark.audio) : "");

  const image =
    "image" in landmark ? landmark.image : "";

  return (
    <main
      dir={isArabic ? "rtl" : "ltr"}
      className="min-h-screen bg-white text-black"
    >
      <section className="mx-auto w-full max-w-md px-6 py-8">

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href={`/${currentLocale}/lubeck`}
            className="text-sm font-medium text-zinc-500 hover:text-black"
          >
            {isArabic ? "→" : "←"} {t.back}
          </Link>

          <span className="text-sm text-zinc-500">
            {isArabic
              ? `المحطة ${currentIndex + 1} من ${landmarks.length}`
              : `Stop ${currentIndex + 1} of ${landmarks.length}`}
          </span>
        </div>

        {/* Tour progress */}
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full rounded-full bg-black"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>

        {/* Landmark image */}
        {image ? (
          <div className="relative mt-6 aspect-[4/3] overflow-hidden rounded-3xl">
            <Image
              src={image}
              alt={name}
              fill
              priority={currentIndex === 0}
              className="object-cover"
            />
          </div>
        ) : (
          <div className="mt-6 aspect-[4/3] rounded-3xl bg-zinc-200" />
        )}

        {/* Header */}
        <div className="mt-6">
          <p className="text-sm font-medium text-zinc-500">
            🎧 {t.audioGuide} • {duration}
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {name}
          </h1>

          <p className="mt-2 leading-7 text-zinc-600">
            {description}
          </p>
        </div>

        {/* Audio */}
        {audio ? (
          <div className="mt-8">
            <AudioPlayer
              src={audio}
              title={`${name} ${t.audioGuide}`}
            />
          </div>
        ) : (
          <div className="mt-8 rounded-2xl bg-zinc-100 p-5 text-center">
            <p className="text-sm text-zinc-500">
              {isArabic
                ? "الصوت بهذه اللغة سيكون متاحاً قريباً"
                : "Audio for this language is coming soon."}
            </p>
          </div>
        )}

        {/* Story */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold">
            {t.story}
          </h2>

          <p className="mt-3 leading-7 text-zinc-700">
            {story}
          </p>
        </section>

        {/* Quick Facts */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold">
            {t.quickFacts}
          </h2>

          <div className="mt-4 space-y-3">
            {landmark.facts.map((fact) => (
              <div
                key={fact.label}
                className="rounded-xl border border-zinc-200 p-4"
              >
                <p className="text-sm text-zinc-500">
                  {fact.label}
                </p>

                <p className="mt-1 font-semibold">
                  {fact.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* AI Guide */}
        <button
          type="button"
          className="mt-10 flex h-14 w-full items-center justify-center rounded-xl border border-black font-semibold transition hover:bg-zinc-50"
        >
          {t.askAI}
        </button>

        {/* Next stop */}
        {nextLandmark ? (
          <Link
            href={`/${currentLocale}/lubeck/${nextLandmark.slug}`}
            className="mt-4 flex h-16 w-full items-center justify-center rounded-2xl bg-black text-lg font-semibold text-white transition hover:bg-zinc-800"
          >
            {isArabic ? `← ${t.nextStop}` : `${t.nextStop} →`}
          </Link>
        ) : (
          <Link
            href={`/${currentLocale}/lubeck`}
            className="mt-4 flex h-16 w-full items-center justify-center rounded-2xl bg-black text-lg font-semibold text-white"
          >
            {t.finishTour} ✓
          </Link>
        )}
      </section>
    </main>
  );
}