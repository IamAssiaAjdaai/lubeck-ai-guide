import { useCallback, useEffect, useState } from "react";

import { citywalkApi } from "../lib/api/instance";
import {
  parseCityIndexResponse,
  parseCitySummaryResponse,
  parsePlaceResponse,
  type GuideEligibilityResponse,
  type NativeLocale,
  type PublicCityIndexResponse,
  type PublicCitySummaryResponse,
  type PublicPlaceResponse,
} from "../lib/api/contracts";
import {
  publicContentCache,
  publicContentCacheKey,
  type PublicContentFetch,
} from "../lib/publicContentCache";

type RemoteState<T> =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "available"; data: T }>
  | Readonly<{ status: "error" }>;

export function usePublicCities(locale: NativeLocale): RemoteState<PublicCityIndexResponse> {
  const fetcher = useCallback(
    (etag: string | undefined, signal: AbortSignal) => citywalkApi.loadCities(locale, etag, signal),
    [locale],
  );
  return useCachedPublicContent(
    publicContentCacheKey("cities", locale),
    parseCityIndexResponse,
    fetcher,
  );
}

export function usePublicCity(
  citySlug: string,
  locale: NativeLocale,
): RemoteState<PublicCitySummaryResponse> {
  const fetcher = useCallback(
    (etag: string | undefined, signal: AbortSignal) =>
      citywalkApi.loadCitySummary(citySlug, locale, etag, signal),
    [citySlug, locale],
  );
  return useCachedPublicContent(
    publicContentCacheKey("city", locale, citySlug),
    parseCitySummaryResponse,
    fetcher,
  );
}

export function usePublicPlace(
  citySlug: string,
  placeSlug: string,
  locale: NativeLocale,
): RemoteState<PublicPlaceResponse> {
  const fetcher = useCallback(
    (etag: string | undefined, signal: AbortSignal) =>
      citywalkApi.loadPlace(citySlug, placeSlug, locale, etag, signal),
    [citySlug, locale, placeSlug],
  );
  return useCachedPublicContent(
    publicContentCacheKey("place", locale, citySlug, placeSlug),
    parsePlaceResponse,
    fetcher,
  );
}

export function prefetchPublicCity(citySlug: string, locale: NativeLocale): Promise<void> {
  return publicContentCache.prefetch(
    publicContentCacheKey("city", locale, citySlug),
    parseCitySummaryResponse,
    (etag, signal) => citywalkApi.loadCitySummary(citySlug, locale, etag, signal),
  );
}

export function prefetchPublicPlace(
  citySlug: string,
  placeSlug: string,
  locale: NativeLocale,
): Promise<void> {
  return publicContentCache.prefetch(
    publicContentCacheKey("place", locale, citySlug, placeSlug),
    parsePlaceResponse,
    (etag, signal) => citywalkApi.loadPlace(citySlug, placeSlug, locale, etag, signal),
  );
}

export function useGuideEligibility(
  citySlug: string,
  placeSlug: string,
): RemoteState<GuideEligibilityResponse> {
  return useRemoteContent(
    () => citywalkApi.getGuideEligibility(citySlug, placeSlug),
    [citySlug, placeSlug],
  );
}

function useCachedPublicContent<T>(
  key: string,
  parse: (value: unknown) => T,
  fetcher: (etag: string | undefined, signal: AbortSignal) => Promise<PublicContentFetch<T>>,
): RemoteState<T> {
  const cached = publicContentCache.peek<T>(key);
  const [state, setState] = useState<Readonly<{
    requestKey: string;
    result: RemoteState<T>;
  }>>({
    requestKey: key,
    result: cached ? { status: "available", data: cached } : { status: "loading" },
  });

  useEffect(() => {
    let active = true;
    const updateFromCache = () => {
      const data = publicContentCache.peek<T>(key);
      if (active && data) setState({ requestKey: key, result: { status: "available", data } });
    };
    const unsubscribe = publicContentCache.subscribe(key, updateFromCache);
    void publicContentCache.load(key, parse, fetcher)
      .then((data) => {
        if (active) setState({ requestKey: key, result: { status: "available", data } });
      })
      .catch(() => {
        if (active && !publicContentCache.peek<T>(key)) {
          setState({ requestKey: key, result: { status: "error" } });
        }
      });
    return () => {
      active = false;
      unsubscribe();
      publicContentCache.cancelIfUnused(key);
    };
  }, [fetcher, key, parse]);

  if (state.requestKey !== key) {
    return cached ? { status: "available", data: cached } : { status: "loading" };
  }
  return state.result;
}

function useRemoteContent<T>(load: () => Promise<T>, dependencies: readonly unknown[]): RemoteState<T> {
  const requestKey = JSON.stringify(dependencies);
  const [state, setState] = useState<Readonly<{
    requestKey: string;
    result: RemoteState<T>;
  }>>({ requestKey, result: { status: "loading" } });

  useEffect(() => {
    let active = true;
    void load()
      .then((data) => {
        if (active) setState({ requestKey, result: { status: "available", data } });
      })
      .catch(() => {
        if (active) setState({ requestKey, result: { status: "error" } });
      });
    return () => {
      active = false;
    };
    // The caller supplies stable scalar dependencies for its loader.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return state.requestKey === requestKey ? state.result : { status: "loading" };
}
