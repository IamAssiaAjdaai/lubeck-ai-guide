import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import TrackLandmarkView from "@/components/TrackLandmarkView";
import AudioPlayer from "@/components/AudioPlayer";
import TrackedLink from "@/components/TrackedLink";
import AskGuide from "@/components/AskGuide";
import { landmarks } from "@/data/landmarks";
import {
  formatMessage,
  getDirection,
  getTranslations,
  isLocale,
  locales,
} from "@/lib/i18n";

type LandmarkPageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

/*
 * Next.js will generate all combinations:
 *
 * /en/lubeck/holstentor
 * /de/lubeck/holstentor
 * /fr/lubeck/holstentor
 * /ar/lubeck/holstentor
 *
 * ...and the same for every landmark.
 */
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

  /*
   * Validate language
   */
  if (!isLocale(locale)) {
    notFound();
  }

  const currentLocale = locale;
  const t = getTranslations(currentLocale);
  const direction = getDirection(currentLocale);
  const forwardArrow = direction === "rtl" ? "←" : "→";
  const backArrow = direction === "rtl" ? "→" : "←";

  /*
   * Find current landmark
   */
  const currentIndex = landmarks.findIndex(
    (landmark) => landmark.slug === slug
  );

  if (currentIndex === -1) {
    notFound();
  }

  const landmark = landmarks[currentIndex];

  /*
   * Get translated landmark content
   */
  const content = landmark.content[currentLocale];

  const name = content.name;
  const duration = content.duration;
  const description = content.description;
  const story = content.story;
  const audio = content.audio;
  const facts = content.facts;
  const image = landmark.image;

  /*
   * Find next landmark
   */
  const nextLandmark = landmarks[currentIndex + 1];

  /*
   * Calculate tour progress
   */
  const progress =
    ((currentIndex + 1) / landmarks.length) * 100;

  return (
    <main
      lang={currentLocale}
      dir={direction}
      className="min-h-screen bg-white text-black"
    >
      <section className="mx-auto w-full max-w-md px-6 py-8">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <TrackLandmarkView
            city="lubeck"
            landmark={landmark.slug}
            locale={currentLocale}
            stopNumber={currentIndex + 1}
          />
          <Link
            href={`/${currentLocale}/lubeck`}
            className="text-sm font-medium text-zinc-500 transition hover:text-black"
          >
            {backArrow} {t.common.back}
          </Link>

          <span className="text-sm text-zinc-500">
            {formatMessage(t.landmark.stopProgress, {
              current: currentIndex + 1,
              total: landmarks.length,
            })}
          </span>
        </div>

        {/* Tour progress */}
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full rounded-full bg-black transition-all"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>

        {/* Landmark image */}
        {image ? (
          <div className="relative mt-6 aspect-[4/3] overflow-hidden rounded-3xl bg-zinc-200">
            <Image
              src={image}
              alt={name}
              fill
              priority={currentIndex === 0}
              sizes="(max-width: 448px) 100vw, 448px"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="mt-6 aspect-[4/3] w-full rounded-3xl bg-zinc-200" />
        )}

        {/* Landmark header */}
        <div className="mt-6">
          <p className="text-sm font-medium text-zinc-500">
            🎧 {t.landmark.audioGuide} • {duration}
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {name}
          </h1>

          <p className="mt-3 leading-7 text-zinc-600">
            {description}
          </p>
        </div>

        {/* Audio */}
        {audio ? (
          <div className="mt-8">
            <AudioPlayer
              src={audio}
              title={`${name} ${t.landmark.audioGuide}`}
              city="lubeck"
              landmark={landmark.slug}
              locale={currentLocale}
              listenLabel={t.landmark.listenStory}
              playLabel={t.common.play}
              pauseLabel={t.common.pause}
              unavailableLabel={t.landmark.audioUnavailable}
            />
          </div>
        ) : (
          <div className="mt-8 rounded-2xl bg-zinc-100 p-5">
            <p className="text-center text-sm text-zinc-500">
              {t.landmark.audioUnavailable}
            </p>
          </div>
        )}

        {/* Story */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold">
            {t.landmark.story}
          </h2>

          <p className="mt-3 leading-7 text-zinc-700">
            {story}
          </p>
        </section>

        {/* Quick facts */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold">
            {t.landmark.quickFacts}
          </h2>

          <div className="mt-4 space-y-3">
            {facts.map((fact) => (
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
          <AskGuide
            landmark={landmark.slug}
            landmarkName={name}
            locale={currentLocale}
            direction={direction}
            buttonLabel={t.ai.open}
            closeLabel={t.common.close}
            labels={t.ai}
          />

        {/* Next landmark / Finish */}
        {nextLandmark ? (
          <Link
            href={`/${currentLocale}/lubeck/${nextLandmark.slug}`}
            className="mt-4 flex h-16 w-full items-center justify-center rounded-2xl bg-black px-6 text-lg font-semibold text-white transition hover:bg-zinc-800"
          >
            {direction === "rtl"
              ? `${forwardArrow} ${t.landmark.nextStop}`
              : `${t.landmark.nextStop} ${forwardArrow}`}
          </Link>
        ) : (
          <TrackedLink
            href={`/${currentLocale}/lubeck/complete`}
            eventName="tour_completed"
            properties={{
              locale: currentLocale,
              total_landmarks: landmarks.length,
              tour_id: "lubeck_historic_center",
            }}
            className="mt-4 flex h-16 w-full items-center justify-center rounded-2xl bg-black px-6 text-lg font-semibold text-white transition hover:bg-zinc-800"
          >
            {t.landmark.finishTour} ✓
          </TrackedLink>
        )}
      </section>
    </main>
  );
}
