import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  Headphones,
  MapPin,
} from "lucide-react";

import AudioPlayer from "@/components/AudioPlayer";
import AskGuide from "@/components/AskGuide";
import type { PlaceContent } from "@/data/places";
import type { ResolvedPlaceAudio } from "@/lib/content/placeAudio";
import { formatTime } from "@/lib/formatTime";
import { getDirection, type Locale, type Translations } from "@/lib/i18n";
import { isApplicationMediaPath } from "@/lib/media/imageDelivery";

type PlaceExperienceProps = Readonly<{
  locale: Locale;
  citySlug: string;
  placeSlug: string;
  contentLocale: Locale;
  content: PlaceContent;
  image?: string;
  audio?: ResolvedPlaceAudio;
  categoryLabel: string;
  visitDurationLabel: string;
  backHref: string;
  translations: Translations;
  guideEnabled?: boolean;
}>;

export function PlaceExperience({
  locale,
  citySlug,
  placeSlug,
  contentLocale,
  content,
  image,
  audio,
  categoryLabel,
  visitDurationLabel,
  backHref,
  translations,
  guideEnabled = false,
}: PlaceExperienceProps) {
  const interfaceDirection = getDirection(locale);
  const contentDirection = getDirection(contentLocale);
  const BackIcon = interfaceDirection === "rtl" ? ArrowRight : ArrowLeft;
  const description = content.description ?? content.shortDescription;
  const facts = content.facts ?? [];

  return (
    <main lang={locale} dir={interfaceDirection} className="app-shell">
      <section className="content-container py-7 sm:py-10">
        <Link
          href={backHref}
          aria-label={translations.common.back}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-text-secondary transition hover:border-blue-200 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <BackIcon aria-hidden="true" size={19} strokeWidth={1.8} />
        </Link>

        {image ? (
          <div className="relative mt-6 aspect-[4/3] overflow-hidden rounded-[var(--radius-lg)] bg-surface">
            <Image
              src={image}
              alt={content.name}
              fill
              priority
              unoptimized={isApplicationMediaPath(image)}
              sizes="(max-width: 448px) 100vw, 448px"
              className="object-cover"
            />
          </div>
        ) : null}

        <header className="mt-6">
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-text-secondary">
            <p className="flex items-center gap-1.5">
              <MapPin aria-hidden="true" size={16} strokeWidth={1.8} />
              {categoryLabel}
            </p>
            <span aria-hidden="true">·</span>
            <p className="flex items-center gap-1.5">
              <Clock3 aria-hidden="true" size={16} strokeWidth={1.8} />
              {visitDurationLabel}
            </p>
          </div>

          <div lang={contentLocale} dir={contentDirection}>
            <h1 className="mt-2 text-[2rem] font-bold leading-tight tracking-[-0.03em]">
              {content.name}
            </h1>
            <p className="mt-3 text-base leading-7 text-text-secondary">
              {description}
            </p>

            {content.visitNote ? (
              <p className="mt-4 rounded-xl border border-border bg-surface p-4 text-sm leading-6 text-text-secondary">
                {content.visitNote}
              </p>
            ) : null}
          </div>
        </header>

        {audio ? (
          <section className="mt-8" aria-labelledby="generic-place-audio">
            <h2
              id="generic-place-audio"
              className="mb-3 flex items-center gap-2 text-[1.125rem] font-semibold tracking-[-0.02em]"
            >
              <Headphones aria-hidden="true" size={19} strokeWidth={1.8} />
              <span>
                {translations.landmark.audioGuide}
                {audio.durationSeconds
                  ? ` · ${formatTime(audio.durationSeconds)}`
                  : ""}
              </span>
            </h2>
            <AudioPlayer
              src={audio.src}
              title={`${content.name} ${translations.landmark.audioGuide}`}
              city={citySlug}
              landmark={placeSlug}
              locale={locale}
              listenLabel={translations.landmark.listenStory}
              playLabel={translations.common.play}
              pauseLabel={translations.common.pause}
              unavailableLabel={translations.landmark.audioUnavailable}
            />
          </section>
        ) : null}

        {content.story ? (
          <section className="mt-9">
            <h2 className="text-[1.375rem] font-semibold tracking-[-0.02em]">
              {translations.landmark.story}
            </h2>
            <p
              lang={contentLocale}
              dir={contentDirection}
              className="mt-3 text-base leading-7 text-text-primary"
            >
              {content.story}
            </p>
          </section>
        ) : null}

        {facts.length > 0 ? (
          <section className="mt-9">
            <h2 className="text-[1.375rem] font-semibold tracking-[-0.02em]">
              {translations.landmark.quickFacts}
            </h2>
            <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,9.75rem),1fr))] gap-3">
              {facts.map((fact) => (
                <div
                  key={`${fact.label}-${fact.value}`}
                  lang={contentLocale}
                  dir={contentDirection}
                  className="surface-card min-w-0 p-4 last:odd:col-span-full"
                >
                  <p className="text-[13px] text-text-secondary">{fact.label}</p>
                  <p className="mt-1 break-words text-[15px] font-semibold leading-6">
                    {fact.value}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {guideEnabled ? (
          <AskGuide
            citySlug={citySlug}
            placeSlug={placeSlug}
            placeName={content.name}
            locale={locale}
            direction={interfaceDirection}
            buttonLabel={translations.ai.open}
            closeLabel={translations.common.close}
            labels={translations.ai}
            suggestions={[
              translations.ai.suggestionFamous,
              translations.ai.suggestionBuilt,
              translations.ai.suggestionStory,
            ]}
          />
        ) : null}
      </section>
    </main>
  );
}
