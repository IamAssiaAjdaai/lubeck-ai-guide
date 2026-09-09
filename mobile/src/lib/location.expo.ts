import * as Location from "expo-location";

import type { ForegroundLocationAdapter } from "./location";

export const expoForegroundLocationAdapter: ForegroundLocationAdapter = {
  async requestPermission() {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) return "unavailable";
    const permission = await Location.requestForegroundPermissionsAsync();
    return permission.status === Location.PermissionStatus.GRANTED
      ? "granted"
      : "denied";
  },
  async getCurrentPosition() {
    const result = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: result.coords.latitude,
      longitude: result.coords.longitude,
    };
  },
};
