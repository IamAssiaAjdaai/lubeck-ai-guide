import Image from "next/image";
import {
  LUBECK_HISTORIC_TOUR_ID,
} from "@/lib/tourContext";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { headers } from "next/headers";
import {
  ArrowLeft,
  ArrowRight,
  CircleCheckBig,
  Clock3,
  Gem,
  Headphones,
  MapPin,
} from "lucide-react";
import TrackLandmarkView from "@/components/TrackLandmarkView";
import AudioPlayer from "@/components/AudioPlayer";
import TrackedLink from "@/components/TrackedLink";
import AskGuide from "@/components/AskGuide";
import {
  getPlaceDurationLabel,
  HIDDEN_GEM_TAG,
  lubeckLandmarks as landmarks,
  lubeckPlaces,
  resolvePlaceContent,
} from "@/data/places";
import {
  getLandmarkAudio,
} from "@/data/landmarkAudio";
import {
  formatMessage,
  getDirection,
  getTranslations,
  isLocale,
  locales,
} from "@/lib/i18n";
import { getContentSource } from "@/lib/content/source";
import { resolveLandmarkPageAudio } from "@/lib/content/landmarkAudio";
import { resolvePlaceImage } from "@/lib/content/placeMedia";
import { getPublicCitySnapshot } from "@/lib/content/publicRepository.server";
import { formatTime } from "@/lib/formatTime";
import { getGuideEligibility } from "@/lib/guideEligibility.server";
import { auth } from "@/lib/auth/server";
import { CityPassPaywall } from "@/components/commerce/CityPassPaywall";
import { getCityPassCopy } from "@/lib/commerce/cityPassCopy";
import { createCityPassReturnPath } from "@/lib/commerce/cityPassReturn";
import { getCityPassAccessState } from "@/lib/commerce/cityPassAccess.server";
import {
  getPremiumPlaceAudio,
  type PremiumPlaceAudio,
} from "@/lib/commerce/premiumMedia.server";
import {
  formatMinorCurrency,
  getLubeckCityPassOffer,
} from "@/lib/commerce/queries.server";

type LandmarkPageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
  searchParams?: Promise<{ premium?: string | string[] }>;
};

/*
 * Next.js will generate all combinations:
 *
 * /en/lubeck/holstentor
 * /de/lubeck/holstentor
 * /fr/lubeck/holstentor
 * /ar/lubeck/holstentor
 *
 * ...and the same for every published code-catalog place.
 */
export function generateStaticParams() {
  return locales.flatMap((locale) =>
    lubeckPlaces.map((place) => ({
      locale,
      slug: place.slug,
    }))
  );
}

export default async function LandmarkPage({
  params,
  searchParams,
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

  const currentIndex = landmarks.findIndex(
    (landmark) => landmark.slug === slug
  );
  const isTourLandmark = currentIndex >= 0;

  const contentSource = getContentSource();
  if (contentSource !== "code") await connection();
  const snapshot = await getPublicCitySnapshot("lubeck", contentSource);
  const landmark = snapshot.places.find((place) => place.slug === slug);

  if (!landmark) {
    notFound();
  }

  /*
   * Get translated landmark content
   */
  const resolvedContent = resolvePlaceContent(landmark, currentLocale);

  if (!resolvedContent) {
    notFound();
  }

  const { actualLocale, content } = resolvedContent;
  const contentDirection = getDirection(actualLocale);

  const name = content.name;
  const visitDuration = isTourLandmark
    ? undefined
    : getPlaceDurationLabel(landmark, currentLocale);
  const description = content.description ?? content.shortDescription;
  const story = content.story;
  const legacyAudio = getLandmarkAudio(
    landmark.slug,
    currentLocale,
  );
  const audio = resolveLandmarkPageAudio(
    contentSource,
    snapshot.media?.places[landmark.slug],
    currentLocale,
    legacyAudio,
  );
  const audioDuration = audio?.durationSeconds === undefined
    ? undefined
    : formatTime(audio.durationSeconds);
  const facts = content.facts ?? [];
  const image = resolvePlaceImage(
    contentSource,
    snapshot.media?.places[landmark.slug],
    currentLocale,
    landmark.image,
    "detail",
  );
  const isHiddenGem = landmark.tags.includes(HIDDEN_GEM_TAG);
  const guideEnabled = isTourLandmark && await getGuideEligibility({
    citySlug: "lubeck",
    placeSlug: landmark.slug,
    source: contentSource,
    snapshot,
  });
  let premiumAudio: PremiumPlaceAudio | undefined;
  if (contentSource !== "code" && snapshot.media) {
    try {
      premiumAudio = await getPremiumPlaceAudio(
        "lubeck",
        landmark.slug,
        currentLocale,
      );
    } catch (error) {
      if (contentSource === "database") throw error;
    }
  }
  const premiumCopy = getCityPassCopy(currentLocale);
  const premiumValue = (await searchParams)?.premium;
  const premiumRequested =
    (Array.isArray(premiumValue) ? premiumValue[0] : premiumValue) === "1";
  const premiumState = premiumAudio
    ? await resolvePremiumState(currentLocale)
    : undefined;

  /*
   * Find next landmark
   */
  const nextLandmark = isTourLandmark
    ? landmarks[currentIndex + 1]
    : undefined;

  /*
   * Calculate tour progress
   */
  const progress = isTourLandmark
    ? ((currentIndex + 1) / landmarks.length) * 100
    : 0;

  return (
    <main
      lang={currentLocale}
      dir={direction}
      className="app-shell"
    >
      <section className="content-container py-7 sm:py-10">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          {isTourLandmark ? (
            <TrackLandmarkView
              tourId={LUBECK_HISTORIC_TOUR_ID}
              city="lubeck"
              landmark={landmark.slug}
              locale={currentLocale}
              stopNumber={currentIndex + 1}
            />
          ) : null}
          <Link
            href={`/${currentLocale}/lubeck`}
            aria-label={t.common.back}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-text-secondary transition hover:border-blue-200 hover:text-accent"
          >
            <BackIcon aria-hidden="true" size={19} strokeWidth={1.8} />
          </Link>

          {isTourLandmark ? (
            <span className="text-[13px] font-medium text-text-secondary">
              {formatMessage(t.landmark.stopProgress, {
                current: currentIndex + 1,
                total: landmarks.length,
              })}
            </span>
          ) : null}
        </div>

        {/* Tour progress */}
        {isTourLandmark ? (
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        ) : null}

        {/* Landmark image */}
        {image ? (
          <div className="relative mt-6 aspect-[4/3] overflow-hidden rounded-[var(--radius-lg)] bg-surface">
            <Image
              src={image}
              alt={name}
              fill
              priority={isTourLandmark && currentIndex === 0}
              sizes="(max-width: 448px) 100vw, 448px"
              className="object-cover"
            />
          </div>
        ) : null}

        {/* Landmark header */}
        <div className="mt-6">
          {isTourLandmark ? (
          <p className="flex items-center gap-2 text-sm font-medium text-text-secondary">
            <Headphones aria-hidden="true" size={17} strokeWidth={1.8} />
            <span>
              {t.landmark.audioGuide}
              {audioDuration ? ` · ${audioDuration}` : ""}
            </span>
          </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-text-secondary">
              <p className="flex items-center gap-1.5">
                <MapPin aria-hidden="true" size={16} strokeWidth={1.8} />
                {t.placeCategories[landmark.category]}
              </p>
              <span aria-hidden="true">·</span>
              <p className="flex items-center gap-1.5">
                <Clock3 aria-hidden="true" size={16} strokeWidth={1.8} />
                {visitDuration}
              </p>
            </div>
          )}

          <h1
            lang={actualLocale}
            dir={contentDirection}
            className="mt-2 text-[2rem] font-bold leading-tight tracking-[-0.03em]"
          >
            {name}
          </h1>

          {isHiddenGem ? (
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
              <Gem aria-hidden="true" size={14} strokeWidth={1.8} />
              {t.tourPreferences["hidden-gems"]}
            </span>
          ) : null}

          <p
            lang={actualLocale}
            dir={contentDirection}
            className="mt-3 text-base leading-7 text-text-secondary"
          >
            {description}
          </p>

          {content.visitNote ? (
            <p
              lang={actualLocale}
              dir={contentDirection}
              className="mt-4 rounded-xl border border-border bg-surface p-4 text-sm leading-6 text-text-secondary"
            >
              {content.visitNote}
            </p>
          ) : null}
        </div>

        {/* Audio */}
        {audio ? (
          <div
            id="audio-guide"
            className="mt-8 scroll-mt-6"
          >
            <AudioPlayer
              src={audio.src}
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
        ) : isTourLandmark ? (
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
        ) : null}

        {premiumAudio ? (
          premiumState?.access.active ? (
            <section id="premium-audio" className="mt-8 scroll-mt-6 rounded-3xl border border-violet-200 bg-violet-50/70 p-5" lang={premiumCopy.actualLocale} dir={premiumCopy.actualLocale === "ar" ? "rtl" : "ltr"}>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-700">CITYWALK PASS</p>
              <h2 className="mt-2 text-xl font-semibold">{premiumCopy.premiumAudio}</h2>
              {premiumState.access.expiresAt ? (
                <p className="mt-2 text-sm text-text-secondary">
                  {premiumCopy.activeUntil.replace(
                    "{date}",
                    new Intl.DateTimeFormat(currentLocale, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(premiumState.access.expiresAt),
                  )}
                </p>
              ) : null}
              <div className="mt-4">
                <AudioPlayer
                  src={premiumAudio.src}
                  title={`${name} ${premiumCopy.premiumAudio}`}
                  city="lubeck"
                  landmark={landmark.slug}
                  locale={currentLocale}
                  listenLabel={premiumCopy.continuePremium}
                  playLabel={t.common.play}
                  pauseLabel={t.common.pause}
                  unavailableLabel={t.landmark.audioUnavailable}
                  premiumAnalytics={{
                    city_slug: "lubeck",
                    feature_id: "hidden_lubeck_audio",
                    locale: currentLocale,
                    entitlement_scope: "city:lubeck",
                  }}
                />
              </div>
            </section>
          ) : (
            <CityPassPaywall
              locale={currentLocale}
              copy={premiumCopy}
              returnPath={createCityPassReturnPath(currentLocale, landmark.slug)}
              signedIn={premiumState?.signedIn ?? false}
              offer={premiumState?.offer}
              initiallyOpen={premiumRequested}
            />
          )
        ) : null}

        {/* Story */}
        {story ? (
          <section className="mt-9">
            <h2 className="text-[1.375rem] font-semibold tracking-[-0.02em]">
              {t.landmark.story}
            </h2>

            <p
              lang={actualLocale}
              dir={contentDirection}
              className="mt-3 text-base leading-7 text-text-primary"
            >
              {story}
            </p>
          </section>
        ) : null}

        {/* Quick facts */}
        {facts.length > 0 ? (
        <section className="mt-9">
          <h2 className="text-[1.375rem] font-semibold tracking-[-0.02em]">
            {t.landmark.quickFacts}
          </h2>

          <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,9.75rem),1fr))] gap-3">
            {facts.map((fact) => (
              <div
                key={fact.label}
                lang={actualLocale}
                dir={contentDirection}
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
        ) : null}

        {/* AI Guide remains scoped to the verified canonical tour. */}
        {guideEnabled ? (
          <AskGuide
            tourId={LUBECK_HISTORIC_TOUR_ID}
            citySlug="lubeck"
            placeSlug={landmark.slug}
            placeName={name}
            locale={currentLocale}
            direction={direction}
            buttonLabel={t.ai.open}
            closeLabel={t.common.close}
            labels={t.ai}
            suggestions={[t.ai.suggestionFamous, t.ai.suggestionBuilt, t.ai.suggestionStory]}
          />
        ) : null}

        {/* Next landmark / Finish */}
        {isTourLandmark ? (
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
        ) : null}
      </section>
    </main>
  );
}

async function resolvePremiumState(locale: (typeof locales)[number]) {
  const session = await auth.api.getSession({ headers: await headers() });
  const access = await getCityPassAccessState({
    userId: session?.user.id,
    citySlug: "lubeck",
  });
  const offer = access.active ? undefined : await getLubeckCityPassOffer();
  return {
    signedIn: Boolean(session),
    access,
    offer: offer
      ? {
          priceId: offer.priceId,
          productSlug: offer.productSlug,
          formattedPrice: formatMinorCurrency(
            offer.unitAmount,
            offer.currency,
            locale,
          ),
        }
      : undefined,
  };
}
