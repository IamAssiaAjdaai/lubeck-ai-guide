import * as Location from "expo-location";
import { Platform } from "react-native";

import type { ForegroundLocationAdapter } from "./location";

export const expoForegroundLocationAdapter: ForegroundLocationAdapter = {
  async requestPermission() {
    const permission = await Location.requestForegroundPermissionsAsync();
    return permission.status === Location.PermissionStatus.GRANTED
      ? "granted"
      : "denied";
  },
  async prepareProvider() {
    let provider = await Location.getProviderStatusAsync();
    if (!provider.locationServicesEnabled) return "services_disabled";

    if (Platform.OS === "android" && provider.networkAvailable === false) {
      try {
        await Location.enableNetworkProviderAsync();
        provider = await Location.getProviderStatusAsync();
      } catch {
        // The user may decline improved accuracy. GPS/passive providers can still work.
      }
    }

    const reportedProviders = [
      provider.gpsAvailable,
      provider.networkAvailable,
      provider.passiveAvailable,
    ].filter((available): available is boolean => typeof available === "boolean");
    if (Platform.OS === "android" && reportedProviders.length > 0 && !reportedProviders.some(Boolean)) {
      return "provider_unavailable";
    }

    return "ready";
  },
  async getLastKnownPosition() {
    const result = await Location.getLastKnownPositionAsync({
      maxAge: 2 * 60 * 1_000,
      requiredAccuracy: 250,
    });
    if (!result) return undefined;
    return {
      latitude: result.coords.latitude,
      longitude: result.coords.longitude,
    };
  },
  async getCurrentPosition() {
    const result = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      mayShowUserSettingsDialog: true,
    });
    return {
      latitude: result.coords.latitude,
      longitude: result.coords.longitude,
    };
  },
};
