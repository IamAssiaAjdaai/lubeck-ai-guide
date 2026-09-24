"use client";

import posthog from "posthog-js";
import {
  Building2,
  Footprints,
  Gem,
  History,
  RotateCcw,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useId, useMemo } from "react";

import TrackedLink from "@/components/TrackedLink";
import type { DiscoveryPlace } from "@/components/travel/PlaceDiscovery";
import type { LocalizedPlaceCategory } from "@/data/placeCategories";
import type {
  Locale,
  Translations,
} from "@/lib/i18n";
import { useTourPreferences } from "@/hooks/useTourPreferences";
import {
  DEFAULT_TOUR_PREFERENCES,
  TOUR_INTERESTS,
  rankPlacesForTourPreferences,
  type TourInterest,
  type TourPreferences as TourPreferencesValue,
  type WalkingPreference,
} from "@/lib/tourPreferences";
import {
  clearTourPreferences,
  saveTourPreferences,
} from "@/lib/tourPreferencesStorage";

const interestIcons = {
  history: History,
  architecture: Building2,
  "hidden-gems": Gem,
  family: Users,
} as const satisfies Readonly<
  Record<TourInterest, LucideIcon>
>;

type TourPreferencesProps = Readonly<{
  places: readonly DiscoveryPlace[];
  categories: readonly LocalizedPlaceCategory[];
  labels: Translations["tourPreferences"];
  locale: Locale;
  tourId: string;
  rankingOrigin: Readonly<{
    lat: number;
    lng: number;
  }>;
}>;

function capturePreferenceChange(
  tourId: string,
  locale: Locale,
  preferences: TourPreferencesValue,
): void {
  try {
    posthog.capture(
      "tour_preferences_changed",
      {
        tour_id: tourId,
        locale,
        selected_interests:
          preferences.interests,
        walking_preference:
          preferences.walkingPreference,
      },
    );
  } catch {
    // Personalization must not depend on analytics.
  }
}

export default function TourPreferences({
  places,
  categories,
  labels,
  locale,
  tourId,
  rankingOrigin,
}: TourPreferencesProps) {
  const titleId = useId();
  const interestsId = useId();
  const preferences =
    useTourPreferences(tourId);

  const recommendations = useMemo(
    () =>
      rankPlacesForTourPreferences(
        places,
        preferences,
        { origin: rankingOrigin },
      ).slice(0, 3),
    [places, preferences, rankingOrigin],
  );

  const categoryLabels = useMemo(
    () =>
      new Map(
        categories
          .filter(
            (category) =>
              category.category !== null,
          )
          .map((category) => [
            category.category,
            category.label,
          ]),
      ),
    [categories],
  );

  const updatePreferences = (
    nextPreferences: TourPreferencesValue,
  ) => {
    const validated = saveTourPreferences(
      tourId,
      nextPreferences,
    );

    capturePreferenceChange(
      tourId,
      locale,
      validated,
    );
  };

  const toggleInterest = (
    interest: TourInterest,
  ) => {
    const selected =
      preferences.interests.includes(interest);
    const nextInterests = TOUR_INTERESTS.filter(
      (candidate) =>
        candidate === interest
          ? !selected
          : preferences.interests.includes(
              candidate,
            ),
    );

    updatePreferences({
      ...preferences,
      interests: nextInterests,
    });
  };

  const selectWalkingPreference = (
    walkingPreference: WalkingPreference,
  ) => {
    updatePreferences({
      ...preferences,
      walkingPreference,
    });
  };

  const resetPreferences = () => {
    clearTourPreferences(tourId);
    capturePreferenceChange(
      tourId,
      locale,
      DEFAULT_TOUR_PREFERENCES,
    );
  };

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-[var(--radius-lg)] border border-border bg-surface-elevated p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Footprints
            aria-hidden="true"
            size={21}
            strokeWidth={1.8}
          />
        </span>

        <div className="min-w-0">
          <h2
            id={titleId}
            className="text-xl font-semibold tracking-[-0.02em]"
          >
            {labels.title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-text-secondary">
            {labels.description}
          </p>
        </div>
      </div>

      <fieldset className="mt-5">
        <legend
          id={interestsId}
          className="text-sm font-semibold"
        >
          {labels.interests}
        </legend>

        <div
          role="group"
          aria-labelledby={interestsId}
          className="mt-3 flex flex-wrap gap-2"
        >
          {TOUR_INTERESTS.map((interest) => {
            const Icon = interestIcons[interest];
            const selected =
              preferences.interests.includes(
                interest,
              );

            return (
              <button
                key={interest}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  toggleInterest(interest)
                }
                className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-text-secondary hover:border-blue-200 hover:text-text-primary"
                }`}
              >
                <Icon
                  aria-hidden="true"
                  size={17}
                  strokeWidth={1.8}
                />
                {labels[interest]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold">
          {labels.walkingPreference}
        </legend>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {(
            [
              "standard",
              "less-walking",
            ] as const
          ).map((walkingPreference) => (
            <label
              key={walkingPreference}
              className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-3 py-2 text-center text-sm font-medium transition ${
                preferences.walkingPreference ===
                walkingPreference
                  ? "border-primary bg-accent-soft text-accent"
                  : "border-border bg-background text-text-secondary"
              }`}
            >
              <input
                type="radio"
                name={`${tourId}-walking-preference`}
                value={walkingPreference}
                checked={
                  preferences.walkingPreference ===
                  walkingPreference
                }
                onChange={() =>
                  selectWalkingPreference(
                    walkingPreference,
                  )
                }
                className="sr-only"
              />
              {labels[walkingPreference]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 flex items-center justify-between gap-3">
        <h3 className="font-semibold">
          {labels.recommendedForYou}
        </h3>
        <button
          type="button"
          onClick={resetPreferences}
          className="button-tertiary min-h-11 px-2 text-sm"
        >
          <RotateCcw
            aria-hidden="true"
            size={15}
            strokeWidth={1.8}
          />
          {labels.reset}
        </button>
      </div>

      <ol
        data-testid="tour-recommendations"
        className="mt-3 grid gap-2"
      >
        {recommendations.map((place, index) => {
          const content = (
            <>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">
                {index + 1}
              </span>
              <span
                lang={place.actualLocale}
                dir={place.contentDirection}
                className="min-w-0 flex-1"
              >
                <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-accent rtl:tracking-normal">
                  {categoryLabels.get(
                    place.category,
                  )}
                </span>
                <span className="mt-0.5 block font-semibold">
                  {place.name}
                </span>
                <span className="mt-0.5 line-clamp-1 block text-sm text-text-secondary">
                  {place.shortDescription}
                </span>
              </span>
            </>
          );
          const className =
            "surface-card flex items-center gap-3 p-3 text-start";

          return (
            <li key={place.slug}>
              {place.detailHref ? (
                <TrackedLink
                  href={place.detailHref}
                  eventName="landmark_selected"
                  properties={{
                    landmark_slug: place.slug,
                    locale,
                  }}
                  className={`${className} transition hover:border-blue-200`}
                >
                  {content}
                </TrackedLink>
              ) : (
                <article className={className}>
                  {content}
                </article>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
