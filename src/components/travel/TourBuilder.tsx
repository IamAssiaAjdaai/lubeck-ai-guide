"use client";

import posthog from "posthog-js";
import {
  Clock3,
  Footprints,
  MapPinned,
  Route,
  Sparkles,
} from "lucide-react";
import { useId, useMemo, useState } from "react";

import TrackedLink from "@/components/TrackedLink";
import type { DiscoveryPlace } from "@/components/travel/PlaceDiscovery";
import type { LocalizedPlaceCategory } from "@/data/placeCategories";
import { useTourPreferences } from "@/hooks/useTourPreferences";
import { formatDistance } from "@/lib/distance";
import {
  DEFAULT_TOUR_TIME_BUDGET,
  TOUR_TIME_BUDGETS,
  buildPersonalizedTour,
  type PersonalizedTourResult,
  type TourTimeBudget,
} from "@/lib/tourBuilder";
import type {
  Locale,
  Translations,
} from "@/lib/i18n";
import type { TourPreferences } from "@/lib/tourPreferences";

type TourBuilderProps = Readonly<{
  places: readonly DiscoveryPlace[];
  categories: readonly LocalizedPlaceCategory[];
  labels: Translations["tourBuilder"];
  locale: Locale;
  tourId: string;
  origin: Readonly<{
    lat: number;
    lng: number;
  }>;
}>;

const budgetLabelKeys = {
  60: "minutes60",
  90: "minutes90",
  120: "hours2",
  180: "hours3",
} as const satisfies Readonly<
  Record<
    TourTimeBudget,
    | "minutes60"
    | "minutes90"
    | "hours2"
    | "hours3"
  >
>;

function captureTourBuilt(
  tourId: string,
  locale: Locale,
  timeBudgetMinutes: TourTimeBudget,
  preferences: TourPreferences,
  result: PersonalizedTourResult<DiscoveryPlace>,
): void {
  try {
    posthog.capture(
      "personalized_tour_built",
      {
        tour_id: tourId,
        locale,
        time_budget_minutes:
          timeBudgetMinutes,
        selected_interests:
          preferences.interests,
        walking_preference:
          preferences.walkingPreference,
        stop_count: result.stops.length,
        total_estimated_minutes:
          result.totalMinutes,
      },
    );
  } catch {
    // Route building must not depend on analytics.
  }
}

export default function TourBuilder({
  places,
  categories,
  labels,
  locale,
  tourId,
  origin,
}: TourBuilderProps) {
  const titleId = useId();
  const preferences =
    useTourPreferences(tourId);
  const [timeBudget, setTimeBudget] =
    useState<TourTimeBudget>(
      DEFAULT_TOUR_TIME_BUDGET,
    );
  const [result, setResult] = useState<
    | PersonalizedTourResult<DiscoveryPlace>
    | undefined
  >();
  const categoryLabels = useMemo(
    () =>
      new Map(
        categories.flatMap((category) =>
          category.category
            ? [
                [
                  category.category,
                  category.label,
                ] as const,
              ]
            : [],
        ),
      ),
    [categories],
  );

  const handleBuild = () => {
    const nextResult =
      buildPersonalizedTour({
        places,
        preferences,
        timeBudgetMinutes: timeBudget,
        origin,
      });

    setResult(nextResult);
    captureTourBuilt(
      tourId,
      locale,
      timeBudget,
      preferences,
      nextResult,
    );
  };

  const distanceLabel = result
    ? formatDistance(
        result.totalDistanceMeters,
        locale,
      )
    : undefined;

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-[var(--radius-lg)] border border-border bg-surface-elevated p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Route
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
        <legend className="text-sm font-semibold">
          {labels.availableTime}
        </legend>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TOUR_TIME_BUDGETS.map((budget) => (
            <label
              key={budget}
              className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-3 py-2 text-center text-sm font-medium transition ${
                timeBudget === budget
                  ? "border-primary bg-accent-soft text-accent"
                  : "border-border bg-background text-text-secondary"
              }`}
            >
              <input
                type="radio"
                name={`${tourId}-time-budget`}
                value={budget}
                checked={timeBudget === budget}
                onChange={() =>
                  setTimeBudget(budget)
                }
                className="sr-only"
              />
              {labels[budgetLabelKeys[budget]]}
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="button"
        onClick={handleBuild}
        className="button-primary mt-5 min-h-11 w-full justify-center"
      >
        <Sparkles
          aria-hidden="true"
          size={18}
          strokeWidth={1.8}
        />
        {result ? labels.rebuild : labels.build}
      </button>

      {result ? (
        <div
          className="mt-6 border-t border-border pt-5"
          aria-live="polite"
        >
          <h3 className="text-lg font-semibold">
            {labels.yourRoute}
          </h3>

          {result.stops.length === 0 ? (
            <p
              role="status"
              className="mt-3 rounded-xl bg-accent-soft p-4 text-sm leading-6 text-text-secondary"
            >
              {labels.noRoute}
            </p>
          ) : (
            <>
              <dl className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-background p-3">
                  <dt className="text-xs text-text-muted">
                    {labels.stops}
                  </dt>
                  <dd className="mt-1 font-semibold">
                    {new Intl.NumberFormat(
                      locale,
                    ).format(
                      result.stops.length,
                    )}
                  </dd>
                </div>
                <div className="rounded-xl bg-background p-3">
                  <dt className="flex items-center gap-1.5 text-xs text-text-muted">
                    <Clock3
                      aria-hidden="true"
                      size={14}
                    />
                    {labels.totalTime}
                  </dt>
                  <dd className="mt-1 font-semibold">
                    {labels.minutesFormat.replace(
                      "{minutes}",
                      new Intl.NumberFormat(
                        locale,
                      ).format(
                        result.totalMinutes,
                      ),
                    )}
                  </dd>
                </div>
                <div className="rounded-xl bg-background p-3">
                  <dt className="flex items-center gap-1.5 text-xs text-text-muted">
                    <Footprints
                      aria-hidden="true"
                      size={14}
                    />
                    {labels.walkingTime}
                  </dt>
                  <dd className="mt-1 font-semibold">
                    {labels.minutesFormat.replace(
                      "{minutes}",
                      new Intl.NumberFormat(
                        locale,
                      ).format(
                        result.totalWalkingMinutes,
                      ),
                    )}
                  </dd>
                </div>
                <div className="rounded-xl bg-background p-3">
                  <dt className="flex items-center gap-1.5 text-xs text-text-muted">
                    <MapPinned
                      aria-hidden="true"
                      size={14}
                    />
                    {labels.approximateDistance}
                  </dt>
                  <dd className="mt-1 font-semibold">
                    {distanceLabel}
                  </dd>
                </div>
              </dl>

              <ol
                data-testid="personalized-tour-stops"
                className="mt-4 grid gap-2"
              >
                {result.stops.map(
                  ({ place }, index) => {
                    const content = (
                      <>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                          {index + 1}
                        </span>
                        <span
                          lang={place.actualLocale}
                          dir={
                            place.contentDirection
                          }
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
                          <span className="mt-0.5 block text-sm text-text-secondary">
                            {place.duration}
                          </span>
                          {place.didFallback &&
                          place.fallbackLabel ? (
                            <span className="mt-0.5 block text-xs text-text-muted">
                              {
                                place.fallbackLabel
                              }
                            </span>
                          ) : null}
                        </span>
                      </>
                    );
                    const className =
                      "surface-card flex items-center gap-3 p-3 text-start";

                    return (
                      <li key={place.slug}>
                        {place.detailHref ? (
                          <TrackedLink
                            href={
                              place.detailHref
                            }
                            eventName="landmark_selected"
                            properties={{
                              landmark_slug:
                                place.slug,
                              locale,
                            }}
                            className={`${className} transition hover:border-blue-200`}
                          >
                            {content}
                          </TrackedLink>
                        ) : (
                          <article
                            className={className}
                          >
                            {content}
                          </article>
                        )}
                      </li>
                    );
                  },
                )}
              </ol>
            </>
          )}

          <p className="mt-4 text-xs leading-5 text-text-muted">
            {labels.distanceDisclaimer}
          </p>
          <p className="mt-2 text-xs leading-5 text-text-muted">
            {labels.availabilityNote}
          </p>
        </div>
      ) : null}
    </section>
  );
}
