"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
} from "maplibre-gl";

import TrackedLink from "@/components/TrackedLink";
import type { LocalizedPlaceCategory } from "@/data/placeCategories";
import { mapProviderConfig } from "@/lib/mapProvider";
import {
  calculateMapBounds,
  getMapMarkerAriaLabel,
  type MapPlace,
} from "@/lib/mapPlaces";
import type { Locale, TextDirection } from "@/lib/i18n";

import styles from "./CityMap.module.css";

export type CityMapPlace = MapPlace &
  Readonly<{
    duration: string;
    fallbackLabel?: string;
  }>;

type CityMapProps = Readonly<{
  places: readonly CityMapPlace[];
  categories: readonly LocalizedPlaceCategory[];
  locale: Locale;
  city: string;
  direction: TextDirection;
  labelledBy: string;
  initialCenter?: readonly [lng: number, lat: number];
  initialZoom?: number;
  styleUrl?: string;
}>;

type MarkerEntry = Readonly<{
  marker: Marker;
  element: HTMLButtonElement;
}>;

const DEFAULT_INITIAL_CENTER = [0, 0] as const;

function captureMapEvent(
  eventName: "map_opened" | "map_place_selected",
  properties: Record<string, string>,
) {
  void import("posthog-js")
    .then(({ default: posthog }) => posthog.capture(eventName, properties))
    .catch(() => undefined);
}

export default function CityMap({
  places,
  categories,
  locale,
  city,
  direction,
  labelledBy,
  initialCenter = DEFAULT_INITIAL_CENTER,
  initialZoom = 1,
  styleUrl = mapProviderConfig.styleUrl,
}: CityMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MarkerEntry[]>([]);
  const popupRef = useRef<HTMLElement>(null);
  const [selectedSlug, setSelectedSlug] = useState<string>();

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const selectedPlace = places.find((place) => place.slug === selectedSlug);
  const selectedCategory = selectedPlace
    ? categoryById.get(selectedPlace.category)
    : undefined;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: styleUrl,
      center: [...initialCenter],
      zoom: initialZoom,
      attributionControl: mapProviderConfig.attributionControl,
      dragRotate: false,
      pitchWithRotate: false,
    });

    map.addControl(
      new NavigationControl({ showCompass: false, visualizePitch: false }),
      "top-right",
    );
    map.on("load", () => {
      captureMapEvent("map_opened", { city, locale });
    });
    mapRef.current = map;

    return () => {
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [city, initialCenter, initialZoom, locale, styleUrl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(({ marker }) => marker.remove());

    markersRef.current = places.flatMap((place): MarkerEntry[] => {
      const category = categoryById.get(place.category);
      if (!category) return [];

      const element = document.createElement("button");
      const visual = document.createElement("span");
      element.type = "button";
      element.className = `${styles.marker} ${styles[place.category]}`;
      element.setAttribute(
        "aria-label",
        getMapMarkerAriaLabel(place.name, category.label),
      );
      element.title = getMapMarkerAriaLabel(place.name, category.label);
      element.dataset.placeSlug = place.slug;
      visual.className = styles.markerVisual;
      visual.setAttribute("aria-hidden", "true");
      visual.textContent = category.label.slice(0, 1).toLocaleUpperCase(locale);
      element.appendChild(visual);
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        setSelectedSlug(place.slug);
        map.easeTo({
          center: [place.coordinates.lng, place.coordinates.lat],
          zoom: Math.max(map.getZoom(), 15),
          duration: 350,
        });
        captureMapEvent("map_place_selected", {
          city,
          place_slug: place.slug,
          category: place.category,
          locale,
        });
      });

      const marker = new Marker({ element, anchor: "center" })
        .setLngLat([place.coordinates.lng, place.coordinates.lat])
        .addTo(map);

      return [{ marker, element }];
    });

    const bounds = calculateMapBounds(places);
    if (bounds) {
      map.fitBounds(
        [
          [...bounds[0]],
          [...bounds[1]],
        ],
        { padding: 42, maxZoom: 16, duration: 300 },
      );
    }

    setSelectedSlug((current) =>
      current && places.some((place) => place.slug === current)
        ? current
        : undefined,
    );
  }, [categoryById, city, locale, places]);

  useEffect(() => {
    markersRef.current.forEach(({ element }) => {
      element.classList.toggle(
        styles.selected,
        element.dataset.placeSlug === selectedPlace?.slug,
      );
    });

    if (selectedPlace) popupRef.current?.focus();
  }, [selectedCategory, selectedPlace]);

  return (
    <section
      aria-labelledby={labelledBy}
      className={`mt-4 ${styles.mapFrame}`}
    >
      <div ref={containerRef} className={styles.mapCanvas} dir="ltr" />

      <div className={styles.popupShell} dir={direction} aria-live="polite">
        {selectedPlace && selectedCategory ? (
          <article
            ref={popupRef}
            tabIndex={-1}
            className={styles.popupCard}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-accent rtl:tracking-normal">
              {selectedCategory.label} · {selectedPlace.duration}
            </p>
            <div
              lang={selectedPlace.actualLocale}
              dir={selectedPlace.contentDirection}
            >
              <h3 className="mt-1 text-base font-semibold leading-5">
                {selectedPlace.detailHref ? (
                  <TrackedLink
                    href={selectedPlace.detailHref}
                    eventName="landmark_selected"
                    properties={{
                      landmark_slug: selectedPlace.slug,
                      locale,
                    }}
                    className="underline decoration-blue-200 underline-offset-4 hover:decoration-primary"
                  >
                    {selectedPlace.name}
                  </TrackedLink>
                ) : (
                  selectedPlace.name
                )}
              </h3>
              <p className="mt-1 line-clamp-2 text-sm leading-5 text-text-secondary">
                {selectedPlace.shortDescription}
              </p>
            </div>
            {selectedPlace.didFallback && selectedPlace.fallbackLabel ? (
              <p className="mt-2 text-xs text-text-muted">
                {selectedPlace.fallbackLabel}
              </p>
            ) : null}
          </article>
        ) : null}
      </div>
    </section>
  );
}
