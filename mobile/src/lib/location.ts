export type NativeLocationStatus =
  | "idle"
  | "requesting"
  | "available"
  | "denied"
  | "unavailable"
  | "error";

export type NativeUserLocation = Readonly<{
  latitude: number;
  longitude: number;
}>;

export type ForegroundLocationAdapter = Readonly<{
  requestPermission(): Promise<"granted" | "denied" | "unavailable">;
  getCurrentPosition(): Promise<NativeUserLocation>;
}>;

export type NativeLocationResult =
  | Readonly<{ status: "available"; location: NativeUserLocation }>
  | Readonly<{ status: "denied" | "unavailable" | "error" }>;

export async function requestForegroundLocation(
  adapter: ForegroundLocationAdapter,
): Promise<NativeLocationResult> {
  try {
    const permission = await adapter.requestPermission();
    if (permission !== "granted") return { status: permission };
    const location = await adapter.getCurrentPosition();
    if (!isCoordinate(location.latitude, 90) || !isCoordinate(location.longitude, 180)) {
      return { status: "error" };
    }
    return { status: "available", location };
  } catch {
    return { status: "error" };
  }
}

function isCoordinate(value: number, maximum: number) {
  return Number.isFinite(value) && Math.abs(value) <= maximum;
}
