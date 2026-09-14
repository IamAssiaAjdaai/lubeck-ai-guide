export type NativeLocationStatus =
  | "idle"
  | "requesting"
  | "available"
  | "denied"
  | "services_disabled"
  | "provider_unavailable"
  | "fix_failed"
  | "error";

export type NativeUserLocation = Readonly<{
  latitude: number;
  longitude: number;
}>;

export type ForegroundLocationAdapter = Readonly<{
  requestPermission(): Promise<"granted" | "denied" | "unavailable">;
  prepareProvider?(): Promise<"ready" | "services_disabled" | "provider_unavailable">;
  checkProvider?(): Promise<"ready" | "services_disabled" | "provider_unavailable">;
  openLocationSettings?(): Promise<void>;
  getLastKnownPosition?(): Promise<NativeUserLocation | undefined>;
  getCurrentPosition(): Promise<NativeUserLocation>;
}>;

export type NativeLocationResult =
  | Readonly<{ status: "available"; location: NativeUserLocation }>
  | Readonly<{
      status:
        | "denied"
        | "services_disabled"
        | "provider_unavailable"
        | "fix_failed"
        | "error";
    }>;

export const LOCATION_FIX_TIMEOUT_MS = 15_000;
export const LAST_KNOWN_LOCATION_TIMEOUT_MS = 2_000;

export async function recheckForegroundLocationProvider(
  adapter: ForegroundLocationAdapter,
): Promise<"ready" | "services_disabled" | "provider_unavailable" | "error"> {
  if (!adapter.checkProvider) return "ready";

  try {
    return await adapter.checkProvider();
  } catch {
    return "error";
  }
}

export async function requestForegroundLocation(
  adapter: ForegroundLocationAdapter,
  options: Readonly<{ timeoutMs?: number }> = {},
): Promise<NativeLocationResult> {
  const timeoutMs = options.timeoutMs ?? LOCATION_FIX_TIMEOUT_MS;

  let permission: Awaited<ReturnType<ForegroundLocationAdapter["requestPermission"]>>;
  try {
    permission = await adapter.requestPermission();
  } catch {
    return { status: "error" };
  }
  if (permission === "denied") return { status: "denied" };
  if (permission === "unavailable") return { status: "provider_unavailable" };

  try {
    if (adapter.prepareProvider) {
      const provider = await adapter.prepareProvider();
      if (provider !== "ready") return { status: provider };
    }
  } catch {
    return { status: "error" };
  }

  if (adapter.getLastKnownPosition) {
    try {
      const lastKnown = await withTimeout(
        adapter.getLastKnownPosition(),
        Math.min(timeoutMs, LAST_KNOWN_LOCATION_TIMEOUT_MS),
      );
      if (lastKnown && isValidLocation(lastKnown)) {
        return { status: "available", location: lastKnown };
      }
    } catch {
      // A cached fix is optional; continue with a fresh foreground request.
    }
  }

  try {
    const location = await withTimeout(adapter.getCurrentPosition(), timeoutMs);
    if (!isValidLocation(location)) return { status: "fix_failed" };
    return { status: "available", location };
  } catch {
    return { status: "fix_failed" };
  }
}

function isValidLocation(location: NativeUserLocation): boolean {
  return isCoordinate(location.latitude, 90) && isCoordinate(location.longitude, 180);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Location request timed out.")), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function isCoordinate(value: number, maximum: number) {
  return Number.isFinite(value) && Math.abs(value) <= maximum;
}
