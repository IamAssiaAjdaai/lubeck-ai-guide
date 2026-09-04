import Image from "next/image";
import {
  LUBECK_HISTORIC_TOUR_ID,
} from "@/lib/tourContext";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CircleCheckBig, Headphones } from "lucide-react";
import TrackLandmarkView from "@/components/TrackLandmarkView";
import AudioPlayer from "@/components/AudioPlayer";
import TrackedLink from "@/components/TrackedLink";
import AskGuide from "@/components/AskGuide";
import {
  getPlaceDurationLabel,
  lubeckLandmarks as landmarks,
} from "@/data/places";
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
  const BackIcon = direction === "rtl" ? ArrowRight : ArrowLeft;
  const NextIcon = direction === "rtl" ? ArrowLeft : ArrowRight;

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
  const duration = getPlaceDurationLabel(landmark, currentLocale);
  const description = content.description;
  const story = content.story;
  const audio = landmark.audio?.[currentLocale] ?? "";
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
      className="app-shell"
    >
      <section className="content-container py-7 sm:py-10">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <TrackLandmarkView
            tourId={LUBECK_HISTORIC_TOUR_ID}
            city="lubeck"
            landmark={landmark.slug}
            locale={currentLocale}
            stopNumber={currentIndex + 1}
          />
          <Link
            href={`/${currentLocale}/lubeck`}
            aria-label={t.common.back}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-text-secondary transition hover:border-blue-200 hover:text-accent"
          >
            <BackIcon aria-hidden="true" size={19} strokeWidth={1.8} />
          </Link>

          <span className="text-[13px] font-medium text-text-secondary">
            {formatMessage(t.landmark.stopProgress, {
              current: currentIndex + 1,
              total: landmarks.length,
            })}
          </span>
        </div>

        {/* Tour progress */}
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>

        {/* Landmark image */}
        {image ? (
          <div className="relative mt-6 aspect-[4/3] overflow-hidden rounded-[var(--radius-lg)] bg-surface">
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
          <div className="mt-6 aspect-[4/3] w-full rounded-[var(--radius-lg)] bg-surface" />
        )}

        {/* Landmark header */}
        <div className="mt-6">
          <p className="flex items-center gap-2 text-sm font-medium text-text-secondary">
            <Headphones aria-hidden="true" size={17} strokeWidth={1.8} /> {t.landmark.audioGuide} · {duration}
          </p>

          <h1 className="mt-2 text-[2rem] font-bold leading-tight tracking-[-0.03em]">
            {name}
          </h1>

          <p className="mt-3 text-base leading-7 text-text-secondary">
            {description}
          </p>
        </div>

        {/* Audio */}
        {audio ? (
          <div
            id="audio-guide"
            className="mt-8 scroll-mt-6"
          >
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
          <div
            id="audio-guide"
            className="mt-7 scroll-mt-6 flex items-center gap-3 rounded-2xl bg-surface p-4 text-text-secondary"
          >
            <Headphones
              aria-hidden="true"
              size={20}
              strokeWidth={1.8}
              className="shrink-0"
            />

            <p className="text-sm leading-6">
              {t.landmark.audioUnavailable}
            </p>
          </div>
        )}

        {/* Story */}
        <section className="mt-9">
          <h2 className="text-[1.375rem] font-semibold tracking-[-0.02em]">
            {t.landmark.story}
          </h2>

          <p className="mt-3 text-base leading-7 text-text-primary">
            {story}
          </p>
        </section>

        {/* Quick facts */}
        <section className="mt-9">
          <h2 className="text-[1.375rem] font-semibold tracking-[-0.02em]">
            {t.landmark.quickFacts}
          </h2>

          <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,9.75rem),1fr))] gap-3">
            {facts.map((fact) => (
              <div
                key={fact.label}
                className="surface-card min-w-0 p-4 last:odd:col-span-full"
              >
                <p className="text-[13px] text-text-secondary">
                  {fact.label}
                </p>

                <p className="mt-1 break-words text-[15px] font-semibold leading-6">
                  {fact.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* AI Guide */}
          <AskGuide
            tourId={LUBECK_HISTORIC_TOUR_ID}
            landmark={landmark.slug}
            landmarkName={name}
            locale={currentLocale}
            direction={direction}
            buttonLabel={t.ai.open}
            closeLabel={t.common.close}
            labels={t.ai}
            suggestions={[t.ai.suggestionFamous, t.ai.suggestionBuilt, t.ai.suggestionStory]}
          />

        {/* Next landmark / Finish */}
        <div className="sticky bottom-3 z-20 -mx-2 mt-7 rounded-2xl bg-background/90 p-2 backdrop-blur-md">
          {nextLandmark ? (
            <Link href={`/${currentLocale}/lubeck/${nextLandmark.slug}`} className="button-dark w-full">
              {t.landmark.nextStop} <NextIcon aria-hidden="true" size={19} strokeWidth={1.8} />
            </Link>
          ) : (
            <TrackedLink
              href={`/${currentLocale}/lubeck/complete`}
              eventName="tour_completed"
              properties={{ locale: currentLocale, total_landmarks: landmarks.length, tour_id: "lubeck_historic_center" }}
              className="button-dark w-full"
            >
              {t.landmark.finishTour} <CircleCheckBig aria-hidden="true" size={19} strokeWidth={1.8} />
            </TrackedLink>
          )}
        </div>
      </section>
    </main>
  );
}
