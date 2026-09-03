"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  requestBrowserLocation,
  UserLocationError,
  type UserLocation,
  type UserLocationStatus,
} from "@/lib/geolocation";

export type UserLocationState = Readonly<{
  status: UserLocationStatus;
  location?: UserLocation;
}>;

export function useUserLocation() {
  const [state, setState] = useState<UserLocationState>({ status: "idle" });
  const activeRequestRef = useRef(0);

  useEffect(
    () => () => {
      activeRequestRef.current += 1;
    },
    [],
  );

  const requestLocation = useCallback(async () => {
    const requestId = activeRequestRef.current + 1;
    activeRequestRef.current = requestId;
    setState({ status: "requesting" });

    try {
      const location = await requestBrowserLocation();
      if (activeRequestRef.current !== requestId) return;
      setState({ status: "available", location });
    } catch (error) {
      if (activeRequestRef.current !== requestId) return;
      setState({
        status: error instanceof UserLocationError ? error.type : "error",
      });
    }
  }, []);

  return {
    ...state,
    requestLocation,
    canRetry:
      state.status !== "requesting" && state.status !== "unsupported",
  } as const;
}
