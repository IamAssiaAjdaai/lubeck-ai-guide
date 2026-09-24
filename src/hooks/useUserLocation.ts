"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  requestBrowserLocation,
  watchBrowserLocation,
  UserLocationError,
  type UserLocation,
  type UserLocationStatus,
} from "@/lib/geolocation";

export type UserLocationState = Readonly<{
  status: UserLocationStatus;
  location?: UserLocation;
}>;

type UseUserLocationOptions = Readonly<{
  onLocation?: (location: UserLocation) => void;
}>;

export function useUserLocation(
  options: UseUserLocationOptions = {},
) {
  const { onLocation } = options;

  const [state, setState] =
    useState<UserLocationState>({
      status: "idle",
    });

  const activeRequestRef = useRef(0);

  const stopWatchingRef =
    useRef<(() => void) | undefined>(
      undefined,
    );

  const onLocationRef = useRef(onLocation);

  useEffect(() => {
    onLocationRef.current = onLocation;
  }, [onLocation]);

  useEffect(
    () => () => {
      activeRequestRef.current += 1;

      stopWatchingRef.current?.();
      stopWatchingRef.current = undefined;
    },
    [],
  );

  const requestLocation =
    useCallback(async () => {
      const requestId =
        activeRequestRef.current + 1;

      activeRequestRef.current =
        requestId;

      stopWatchingRef.current?.();
      stopWatchingRef.current =
        undefined;

      setState({
        status: "requesting",
      });

      try {
        const location =
          await requestBrowserLocation();

        if (
          activeRequestRef.current !==
          requestId
        ) {
          return;
        }

        setState({
          status: "available",
          location,
        });

        onLocationRef.current?.(location);

        stopWatchingRef.current =
          watchBrowserLocation(
            (nextLocation) => {
              if (
                activeRequestRef.current !==
                requestId
              ) {
                return;
              }

              setState({
                status: "available",
                location: nextLocation,
              });

              onLocationRef.current?.(
                nextLocation,
              );
            },
            (error) => {
              if (
                activeRequestRef.current !==
                requestId
              ) {
                return;
              }

              if (
                error.type === "denied"
              ) {
                stopWatchingRef.current?.();
                stopWatchingRef.current =
                  undefined;

                setState({
                  status: "denied",
                });
              }
            },
          );
      } catch (error) {
        if (
          activeRequestRef.current !==
          requestId
        ) {
          return;
        }

        setState({
          status:
            error instanceof
            UserLocationError
              ? error.type
              : "error",
        });
      }
    }, []);

  return {
    ...state,
    requestLocation,
    canRetry:
      state.status !== "requesting" &&
      state.status !== "unsupported",
  } as const;
}