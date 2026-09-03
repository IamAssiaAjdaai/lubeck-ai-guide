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

export class UserLocationError extends Error {
  readonly type: UserLocationErrorType;

  constructor(type: UserLocationErrorType) {
    super(type);
    this.name = "UserLocationError";
    this.type = type;
  }
}

function getErrorType(error: GeolocationPositionError): UserLocationErrorType {
  if (error.code === 1) return "denied";
  if (error.code === 2) return "unavailable";
  if (error.code === 3) return "timeout";
  return "error";
}

export function requestBrowserLocation(): Promise<UserLocation> {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.geolocation?.getCurrentPosition !== "function"
  ) {
    return Promise.reject(new UserLocationError("unsupported"));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const accuracy = Number.isFinite(position.coords.accuracy)
          ? position.coords.accuracy
          : undefined;

        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          ...(accuracy === undefined ? {} : { accuracy }),
          timestamp: position.timestamp,
        });
      },
      (error) => reject(new UserLocationError(getErrorType(error))),
      USER_LOCATION_OPTIONS,
    );
  });
}
