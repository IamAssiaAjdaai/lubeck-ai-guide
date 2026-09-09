import { useEffect, useState } from "react";

import { citywalkApi } from "../lib/api/instance";
import type {
  NativeLocale,
  PublicCityIndexResponse,
  PublicCityResponse,
} from "../lib/api/contracts";

type RemoteState<T> =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "available"; data: T }>
  | Readonly<{ status: "error" }>;

export function usePublicCities(locale: NativeLocale): RemoteState<PublicCityIndexResponse> {
  return useRemoteContent(() => citywalkApi.getCities(locale), [locale]);
}

export function usePublicCity(citySlug: string, locale: NativeLocale): RemoteState<PublicCityResponse> {
  return useRemoteContent(() => citywalkApi.getCity(citySlug, locale), [citySlug, locale]);
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
