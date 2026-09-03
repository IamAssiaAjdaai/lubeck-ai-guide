import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useUserLocation } from "@/hooks/useUserLocation";
import {
  USER_LOCATION_OPTIONS,
  USER_LOCATION_WATCH_OPTIONS,
} from "@/lib/geolocation";

function installGeolocation(
  getCurrentPosition: Geolocation["getCurrentPosition"],
) {
  vi.stubGlobal("navigator", {
    geolocation: { getCurrentPosition },
  });
}

function positionError(code: number): GeolocationPositionError {
  return {
    code,
    message: "Location error",
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useUserLocation", () => {
  it("does not request location automatically and returns a one-time result", async () => {
    const getCurrentPosition = vi.fn<Geolocation["getCurrentPosition"]>(
      (success) =>
        success({
          coords: {
            latitude: 53.865,
            longitude: 10.686,
            accuracy: 12,
          },
          timestamp: 1234,
        } as GeolocationPosition),
    );
    installGeolocation(getCurrentPosition);

    const { result } = renderHook(() => useUserLocation());

    expect(result.current.status).toBe("idle");
    expect(getCurrentPosition).not.toHaveBeenCalled();

    await act(() => result.current.requestLocation());

    expect(result.current.status).toBe("available");
    expect(result.current.location).toEqual({
      lat: 53.865,
      lng: 10.686,
      accuracy: 12,
      timestamp: 1234,
    });
    expect(getCurrentPosition).toHaveBeenCalledOnce();
    expect(getCurrentPosition.mock.calls[0]?.[2]).toEqual(
      USER_LOCATION_OPTIONS,
    );
  });

  it("reports unsupported browsers without throwing", async () => {
    vi.stubGlobal("navigator", {});
    const { result } = renderHook(() => useUserLocation());

    await act(() => result.current.requestLocation());

    expect(result.current.status).toBe("unsupported");
    expect(result.current.canRetry).toBe(false);
  });

  it.each([
    [1, "denied"],
    [2, "unavailable"],
    [3, "timeout"],
    [0, "error"],
  ] as const)("maps browser error %s to %s", async (code, expectedStatus) => {
    installGeolocation(
      vi.fn<Geolocation["getCurrentPosition"]>((_, error) =>
        error?.(positionError(code)),
      ),
    );
    const { result } = renderHook(() => useUserLocation());

    await act(() => result.current.requestLocation());

    expect(result.current.status).toBe(expectedStatus);
    expect(result.current.location).toBeUndefined();
  });

  it("can retry after a recoverable error", async () => {
    const getCurrentPosition = vi
      .fn<Geolocation["getCurrentPosition"]>()
      .mockImplementationOnce((_, error) => error?.(positionError(3)))
      .mockImplementationOnce((success) =>
        success({
          coords: { latitude: 53.86, longitude: 10.68, accuracy: 20 },
          timestamp: 5678,
        } as GeolocationPosition),
      );
    installGeolocation(getCurrentPosition);
    const { result } = renderHook(() => useUserLocation());

    await act(() => result.current.requestLocation());
    expect(result.current.status).toBe("timeout");
    expect(result.current.canRetry).toBe(true);

    await act(() => result.current.requestLocation());
    expect(result.current.status).toBe("available");
    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
  });

  it("updates location from the foreground watch and clears it on unmount", async () => {
  let watchSuccess:
    | PositionCallback
    | undefined;

  const getCurrentPosition =
    vi.fn<Geolocation["getCurrentPosition"]>(
      (success) =>
        success({
          coords: {
            latitude: 53.85,
            longitude: 10.67,
            accuracy: 10,
          },
          timestamp: 1000,
        } as GeolocationPosition),
    );

  const watchPosition =
    vi.fn<Geolocation["watchPosition"]>(
      (success) => {
        watchSuccess = success;
        return 42;
      },
    );

  const clearWatch =
    vi.fn<Geolocation["clearWatch"]>();

  vi.stubGlobal("navigator", {
    geolocation: {
      getCurrentPosition,
      watchPosition,
      clearWatch,
    },
  });

  const { result, unmount } =
    renderHook(() => useUserLocation());

  await act(() =>
    result.current.requestLocation(),
  );

  expect(watchPosition).toHaveBeenCalledOnce();
  expect(
    watchPosition.mock.calls[0]?.[2],
  ).toEqual(
    USER_LOCATION_WATCH_OPTIONS,
  );

  act(() => {
    watchSuccess?.({
      coords: {
        latitude: 53.8662,
        longitude: 10.6797,
        accuracy: 8,
      },
      timestamp: 2000,
    } as GeolocationPosition);
  });

  expect(result.current.location).toEqual({
    lat: 53.8662,
    lng: 10.6797,
    accuracy: 8,
    timestamp: 2000,
  });

  unmount();

  expect(clearWatch).toHaveBeenCalledWith(42);
  });
});
