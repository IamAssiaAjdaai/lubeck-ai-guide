export type UserLocation = Readonly<{
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: number;
}>;

export type UserLocationErrorType =
  | "unsupported"
  | "denied"
  | "unavailable"
  | "timeout"
  | "error";

export type UserLocationStatus =
  | "idle"
  | "requesting"
  | "available"
  | UserLocationErrorType;

export const USER_LOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 60_000,
  timeout: 10_000,
};

export const USER_LOCATION_WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 5_000,
  timeout: 10_000,
};

export class UserLocationError extends Error {
  readonly type: UserLocationErrorType;

  constructor(type: UserLocationErrorType) {
    super(type);
    this.name = "UserLocationError";
    this.type = type;
  }
}

function getErrorType(
  error: GeolocationPositionError,
): UserLocationErrorType {
  if (error.code === 1) return "denied";
  if (error.code === 2) return "unavailable";
  if (error.code === 3) return "timeout";
  return "error";
}

function toUserLocation(
  position: GeolocationPosition,
): UserLocation {
  const accuracy = Number.isFinite(position.coords.accuracy)
    ? position.coords.accuracy
    : undefined;

  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    ...(accuracy === undefined ? {} : { accuracy }),
    timestamp: position.timestamp,
  };
}

export function requestBrowserLocation(): Promise<UserLocation> {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.geolocation?.getCurrentPosition !== "function"
  ) {
    return Promise.reject(
      new UserLocationError("unsupported"),
    );
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(toUserLocation(position)),
      (error) =>
        reject(
          new UserLocationError(getErrorType(error)),
        ),
      USER_LOCATION_OPTIONS,
    );
  });
}

export function watchBrowserLocation(
  onLocation: (location: UserLocation) => void,
  onError?: (error: UserLocationError) => void,
): (() => void) | undefined {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.geolocation?.watchPosition !== "function" ||
    typeof navigator.geolocation?.clearWatch !== "function"
  ) {
    return undefined;
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      onLocation(toUserLocation(position));
    },
    (error) => {
      onError?.(
        new UserLocationError(getErrorType(error)),
      );
    },
    USER_LOCATION_WATCH_OPTIONS,
  );

  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
}