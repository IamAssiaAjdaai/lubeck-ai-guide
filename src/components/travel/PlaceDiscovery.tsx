"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import posthog from "posthog-js";
import { useState } from "react";
import {
  ChevronRight,
  Clock3,
  Landmark,
  LayoutGrid,
  Sparkles,
  Utensils,
  type LucideIcon,
} from "lucide-react";

import TrackedLink from "@/components/TrackedLink";
import {
  filterPlacesByCategory,
  type LocalizedPlaceCategory,
  type PlaceCategoryFilter,
  type PlaceCategoryIconId,
} from "@/data/placeCategories";
import type { Locale, TextDirection } from "@/lib/i18n";
import type { MapPlace } from "@/lib/mapPlaces";

const CityMap = dynamic(() => import("@/components/map/CityMap"), {
  ssr: false,
  loading: () => (
    <div
      aria-hidden="true"
      className="mt-4 h-80 animate-pulse rounded-2xl border bg-surface"
    />
  ),
});

const categoryIcons: Record<PlaceCategoryIconId, LucideIcon> = {
  LayoutGrid,
  Landmark,
  Utensils,
  Sparkles,
};

export type DiscoveryPlace = MapPlace &
  Readonly<{
  duration: string;
  fallbackLabel?: string;
  }>;

type PlaceDiscoveryProps = Readonly<{
  places: readonly DiscoveryPlace[];
  categories: readonly LocalizedPlaceCategory[];
  locale: Locale;
  city: string;
  direction: TextDirection;
  labelledBy: string;
}>;

function PlaceCard({
  place,
  category,
  locale,
  direction,
}: Readonly<{
  place: DiscoveryPlace;
  category: LocalizedPlaceCategory;
  locale: string;
  direction: TextDirection;
}>) {
  const CategoryIcon = categoryIcons[category.icon];
  const cardContent = (
    <>
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-accent-soft">
        {place.image ? (
          <Image
            src={place.image}
            alt=""
            fill
            sizes="96px"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent-soft to-surface">
            <CategoryIcon
              aria-hidden="true"
              size={30}
              strokeWidth={1.5}
              className="text-accent"
            />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 py-0.5">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-accent rtl:tracking-normal">
          <CategoryIcon aria-hidden="true" size={13} strokeWidth={1.8} />
          {category.label}
        </p>
        <div lang={place.actualLocale} dir={place.contentDirection}>
          <h3 className="mt-1 text-[1rem] font-semibold leading-5">
            {place.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-text-secondary">
            {place.shortDescription}
          </p>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 aria-hidden="true" size={14} strokeWidth={1.8} />
            {place.duration}
          </span>
          {place.didFallback && place.fallbackLabel ? (
            <span>{place.fallbackLabel}</span>
          ) : null}
        </div>
      </div>

      {place.detailHref ? (
        <ChevronRight
          aria-hidden="true"
          size={19}
          strokeWidth={1.8}
          className={`shrink-0 text-text-muted transition group-hover:text-text-primary ${direction === "rtl" ? "rotate-180" : ""}`}
        />
      ) : null}
    </>
  );

  const cardClassName =
    "group surface-card flex items-center gap-3 p-3 text-start";

  if (place.detailHref) {
    return (
      <TrackedLink
        href={place.detailHref}
        eventName="landmark_selected"
        properties={{ landmark_slug: place.slug, locale }}
        className={`${cardClassName} transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-sm`}
      >
        {cardContent}
      </TrackedLink>
    );
  }

  return <article className={cardClassName}>{cardContent}</article>;
}

export default function PlaceDiscovery({
  places,
  categories,
  locale,
  city,
  direction,
  labelledBy,
}: PlaceDiscoveryProps) {
  const [selection, setSelection] = useState<PlaceCategoryFilter>("all");
  const visiblePlaces = filterPlacesByCategory(places, selection);

  const handleCategorySelect = (category: PlaceCategoryFilter) => {
    setSelection(category);
    posthog.capture("place_category_selected", {
      category,
      city,
      locale,
    });
  };

  return (
    <>
      <div
        role="group"
        aria-labelledby={labelledBy}
        className="mt-4 grid grid-cols-4 gap-2"
      >
        {categories.map((category) => {
          const Icon = categoryIcons[category.icon];
          const count = filterPlacesByCategory(places, category.id).length;
          const selected = selection === category.id;

          return (
            <button
              key={category.id}
              type="button"
              aria-pressed={selected}
              aria-label={`${category.label} (${count})`}
              onClick={() => handleCategorySelect(category.id)}
              className={`flex min-h-18 flex-col items-center justify-center gap-1 rounded-xl border px-1.5 py-2 text-xs font-semibold transition ${
                selected
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-surface-elevated text-text-secondary hover:border-blue-200 hover:text-text-primary"
              }`}
            >
              <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
              <span className="max-w-full truncate">{category.label}</span>
              <span className={selected ? "text-blue-100" : "text-text-muted"}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <CityMap
        places={visiblePlaces}
        categories={categories}
        locale={locale}
        city={city}
        direction={direction}
        labelledBy={labelledBy}
      />

      <div className="mt-4 flex flex-col gap-3" aria-live="polite">
        {visiblePlaces.map((place) => {
          const category = categories.find(
            (candidate) => candidate.id === place.category,
          );

          if (!category) return null;

          return (
            <PlaceCard
              key={place.slug}
              place={place}
              category={category}
              locale={locale}
              direction={direction}
            />
          );
        })}
      </div>
    </>
  );
}
