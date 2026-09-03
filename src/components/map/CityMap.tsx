"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  GPUInitializationError,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
} from "maplibre-gl";
import { MapPinOff } from "lucide-react";

import TrackedLink from "@/components/TrackedLink";
import MapLocationControl from "@/components/map/MapLocationControl";
import PlaceDistanceLabel from "@/components/travel/PlaceDistanceLabel";
import type { LocalizedPlaceCategory } from "@/data/placeCategories";
import { mapProviderConfig } from "@/lib/mapProvider";
import {
  calculateMapBounds,
  getMapMarkerAriaLabel,
  type MapPlace,
} from "@/lib/mapPlaces";
import type { Locale, TextDirection, Translations } from "@/lib/i18n";
import type { UserLocation, UserLocationStatus } from "@/lib/geolocation";
import type { PlaceDistance } from "@/lib/distance";
import {
  getFatalMapErrorReason,
  getMapFailureDevelopmentLabel,
  isWebGL2Supported,
  MAP_STARTUP_TIMEOUT_MS,
  reportMapInitializationFailure,
  type MapFailureReason,
} from "@/lib/mapSupport";

import styles from "./CityMap.module.css";

export type CityMapPlace = MapPlace &
  Readonly<{
    duration: string;
    fallbackLabel?: string;
    distance?: PlaceDistance;
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
  userLocation?: UserLocation;
  userLocationLabel: string;
  locationStatus: UserLocationStatus;
  locationControlLabel: string;
  onLocationControl: () => void;
  centerUserLocationRequest: number;
  mapLabels: Translations["map"];
  walkingTimeTemplate: string;
}>;

type MarkerEntry = Readonly<{
  marker: Marker;
  element: HTMLButtonElement;
}>;

type MapFailure = Readonly<{
  reason: MapFailureReason;
  retryable: boolean;
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
  userLocation,
  userLocationLabel,
  locationStatus,
  locationControlLabel,
  onLocationControl,
  centerUserLocationRequest,
  mapLabels,
  walkingTimeTemplate,
}: CityMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MarkerEntry[]>([]);
  const userMarkerRef = useRef<Marker | null>(null);
  const lastCenteredLocationRef = useRef<number | undefined>(undefined);
  const handledCenterRequestRef = useRef(0);
  const popupRef = useRef<HTMLElement>(null);
  const [selectedSlug, setSelectedSlug] = useState<string>();
  const [mapFailure, setMapFailure] = useState<MapFailure>();
  const [initializationAttempt, setInitializationAttempt] = useState(0);

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

    let disposed = false;

    if (!isWebGL2Supported()) {
      const fallbackTimer = setTimeout(() => {
        if (disposed) return;
        reportMapInitializationFailure("webgl2-unavailable");
        setMapFailure({ reason: "webgl2-unavailable", retryable: false });
      }, 0);

      return () => {
        disposed = true;
        clearTimeout(fallbackTimer);
      };
    }

    let map: MapLibreMap | null = null;
    let hasLoaded = false;
    let failed = false;
    let startupTimer: ReturnType<typeof setTimeout> | undefined;

    const failMap = (
      reason: MapFailureReason,
      error: unknown,
      retryable: boolean,
    ) => {
      if (disposed || failed) return;
      failed = true;

      reportMapInitializationFailure(reason, error);
      if (startupTimer) clearTimeout(startupTimer);
      startupTimer = undefined;
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current = [];
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;

      const failedMap = map;
      map = null;
      mapRef.current = null;
      failedMap?.remove();
      setMapFailure({ reason, retryable });
    };

    try {
      map = new MapLibreMap({
        container: containerRef.current,
        style: styleUrl,
        center: [...initialCenter],
        zoom: initialZoom,
        attributionControl: mapProviderConfig.attributionControl,
        dragRotate: false,
        pitchWithRotate: false,
      });
      mapRef.current = map;

      map.addControl(
        new NavigationControl({ showCompass: false, visualizePitch: false }),
        "top-right",
      );
      
      const markMapInitialized = () => {
        hasLoaded = true;

        if (startupTimer) {
          clearTimeout(startupTimer);
          startupTimer = undefined;
        }
      };

      map.on("style.load", markMapInitialized);

      map.on("load", () => {
        markMapInitialized();
        captureMapEvent("map_opened", { city, locale });
      });
      map.on("error", (event) => {
        const reason = getFatalMapErrorReason(event, hasLoaded);
        if (!reason) return;
        failMap(
          reason,
          event.error,
          reason !== "webgl2-unavailable",
        );
      });
      startupTimer = setTimeout(() => {
        failMap("startup-timeout", undefined, true);
      }, MAP_STARTUP_TIMEOUT_MS);
    } catch (error) {
      const reason =
        error instanceof GPUInitializationError
          ? "webgl2-unavailable"
          : "constructor";
      failMap(reason, error, reason !== "webgl2-unavailable");
    }

    return () => {
      disposed = true;
      if (startupTimer) clearTimeout(startupTimer);
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current = [];
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      map?.remove();
      map = null;
      mapRef.current = null;
    };
  }, [city, initialCenter, initialZoom, initializationAttempt, locale, styleUrl]);

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
    const map = mapRef.current;
    if (!map) return;

    userMarkerRef.current?.remove();
    userMarkerRef.current = null;

    if (!userLocation) {
      lastCenteredLocationRef.current = undefined;
      return;
    }

    const element = document.createElement("button");
    const visual = document.createElement("span");
    element.type = "button";
    element.className = styles.locationMarker;
    element.setAttribute("aria-label", userLocationLabel);
    element.title = userLocationLabel;
    visual.className = styles.locationMarkerVisual;
    visual.setAttribute("aria-hidden", "true");
    element.appendChild(visual);
    element.addEventListener("click", (event) => {
      event.stopPropagation();
      map.easeTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: Math.max(map.getZoom(), 15),
        duration: 350,
      });
    });

    userMarkerRef.current = new Marker({ element, anchor: "center" })
      .setLngLat([userLocation.lng, userLocation.lat])
      .addTo(map);

    if (lastCenteredLocationRef.current !== userLocation.timestamp) {
      const bounds = calculateMapBounds([
        ...places,
        { coordinates: { lat: userLocation.lat, lng: userLocation.lng } },
      ]);

      if (bounds) {
        map.fitBounds(
          [
            [...bounds[0]],
            [...bounds[1]],
          ],
          { padding: 48, maxZoom: 16, duration: 450 },
        );
      }
      lastCenteredLocationRef.current = userLocation.timestamp;
    }

    return () => {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
    };
  }, [places, userLocation, userLocationLabel]);

  useEffect(() => {
    const map = mapRef.current;
    if (
      !map ||
      !userLocation ||
      centerUserLocationRequest === 0 ||
      handledCenterRequestRef.current === centerUserLocationRequest
    ) {
      return;
    }

    map.easeTo({
      center: [userLocation.lng, userLocation.lat],
      zoom: Math.max(map.getZoom(), 15),
      duration: 350,
    });
    handledCenterRequestRef.current = centerUserLocationRequest;
  }, [centerUserLocationRequest, userLocation]);

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
      {mapFailure ? (
        <div
          role="status"
          dir={direction}
          className={styles.mapFallback}
          data-map-failure={mapFailure.reason}
        >
          <MapPinOff aria-hidden="true" size={25} strokeWidth={1.7} />
          <p>{mapLabels.unavailable}</p>
          {process.env.NODE_ENV === "development" ? (
            <code className={styles.mapFailureCode}>
              {getMapFailureDevelopmentLabel(mapFailure.reason)}
            </code>
          ) : null}
          {mapFailure.retryable ? (
            <button
              type="button"
              className={styles.mapRetry}
              onClick={() => {
                setMapFailure(undefined);
                setInitializationAttempt((attempt) => attempt + 1);
              }}
            >
              {mapLabels.retry}
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div ref={containerRef} className={styles.mapCanvas} dir="ltr" />

          <MapLocationControl
            status={locationStatus}
            label={locationControlLabel}
            onActivate={onLocationControl}
          />

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
            {selectedPlace.distance ? (
              <p className="mt-2 text-xs text-text-muted">
                <PlaceDistanceLabel
                  distance={selectedPlace.distance}
                  locale={locale}
                  walkingTimeTemplate={walkingTimeTemplate}
                />
              </p>
            ) : null}
            {selectedPlace.didFallback && selectedPlace.fallbackLabel ? (
              <p className="mt-2 text-xs text-text-muted">
                {selectedPlace.fallbackLabel}
              </p>
            ) : null}
          </article>
        ) : null}
          </div>
        </>
      )}
    </section>
  );
}
