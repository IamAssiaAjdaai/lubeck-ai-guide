import * as Location from "expo-location";
import { Linking, Platform } from "react-native";

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

    // Samsung and other Android devices can report stale/uncertain individual
    // provider flags. When Location Services are enabled, let the bounded fresh
    // fix determine whether a foreground position is actually available.
    return "ready";
  },
  async checkProvider() {
    const provider = await Location.getProviderStatusAsync();
    return provider.locationServicesEnabled ? "ready" : "services_disabled";
  },
  async openLocationSettings() {
    if (Platform.OS === "android") {
      await Linking.sendIntent("android.settings.LOCATION_SOURCE_SETTINGS");
      return;
    }
    await Linking.openSettings();
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
