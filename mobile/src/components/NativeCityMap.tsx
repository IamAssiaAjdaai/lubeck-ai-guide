import { Camera, Map, Marker, type CameraRef } from "@maplibre/maplibre-react-native";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../design/tokens";
import type { PublicPlace } from "../lib/api/contracts";
import { requestForegroundLocation, type NativeLocationStatus, type NativeUserLocation } from "../lib/location";
import { expoForegroundLocationAdapter } from "../lib/location.expo";
import { resolveMapStyleUrl } from "../lib/mapStyle";
import { useNativeLocale } from "../localization/LocaleProvider";

const MAP_STYLE_URL = resolveMapStyleUrl();

export function NativeCityMap({ places }: Readonly<{
  places: readonly PublicPlace[];
}>) {
  const { messages } = useNativeLocale();
  const cameraRef = useRef<CameraRef>(null);
  const [locationStatus, setLocationStatus] = useState<NativeLocationStatus>("idle");
  const [userLocation, setUserLocation] = useState<NativeUserLocation>();
  const [mapFailed, setMapFailed] = useState(false);
  const initialCenter: [number, number] = places[0]
    ? [places[0].coordinates.lng, places[0].coordinates.lat]
    : [0, 0];

  async function handleLocationRequest() {
    if (userLocation) {
      cameraRef.current?.easeTo({ center: [userLocation.longitude, userLocation.latitude], zoom: 15, duration: 350 });
      return;
    }
    setLocationStatus("requesting");
    const result = await requestForegroundLocation(expoForegroundLocationAdapter);
    setLocationStatus(result.status);
    if (result.status === "available") {
      setUserLocation(result.location);
      cameraRef.current?.easeTo({ center: [result.location.longitude, result.location.latitude], zoom: 15, duration: 350 });
    }
  }

  return (
    <View style={styles.shell}>
      {mapFailed ? (
        <View accessibilityRole="alert" style={styles.fallback}>
          <Text style={styles.statusText}>{messages.locationUnavailable}</Text>
        </View>
      ) : (
        <Map
          mapStyle={MAP_STYLE_URL}
          style={styles.map}
          compass
          attribution
          onDidFailLoadingMap={() => setMapFailed(true)}
        >
          <Camera ref={cameraRef} initialViewState={{ center: initialCenter, zoom: 13 }} />
          {places.map((place) => (
            <Marker
              key={place.slug}
              id={`place-${place.slug}`}
              lngLat={[place.coordinates.lng, place.coordinates.lat]}
            >
              <View
                accessible
                accessibilityLabel={place.content.name}
                style={styles.placeMarker}
              />
            </Marker>
          ))}
          {userLocation ? (
            <Marker id="current-user" lngLat={[userLocation.longitude, userLocation.latitude]}>
              <View accessible accessibilityLabel={messages.useLocation} style={styles.userMarker} />
            </Marker>
          ) : null}
        </Map>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={locationStatus === "requesting" ? messages.locationRequesting : messages.useLocation}
        accessibilityState={{ busy: locationStatus === "requesting", disabled: locationStatus === "requesting" }}
        disabled={locationStatus === "requesting"}
        onPress={() => void handleLocationRequest()}
        style={({ pressed }) => [styles.locationButton, pressed && styles.locationButtonPressed]}
      >
        <Text style={styles.locationButtonText} numberOfLines={1} adjustsFontSizeToFit>
          {locationStatus === "requesting" ? messages.locationRequesting : messages.useLocation}
        </Text>
      </Pressable>
      {locationStatus === "denied" ? <Text style={styles.statusText}>{messages.locationDenied}</Text> : null}
      {locationStatus === "unavailable" || locationStatus === "error" ? (
        <Text style={styles.statusText}>{messages.locationUnavailable}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { gap: spacing.sm },
  map: { height: 320, borderRadius: radius.lg, overflow: "hidden" },
  fallback: { height: 320, borderRadius: radius.lg, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center", padding: spacing.lg },
  placeMarker: { width: 22, height: 22, borderRadius: radius.pill, backgroundColor: colors.mapMarker, borderWidth: 3, borderColor: colors.surface },
  userMarker: { width: 24, height: 24, borderRadius: radius.pill, backgroundColor: colors.userMarker, borderWidth: 4, borderColor: colors.surface },
  locationButton: { minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md },
  locationButtonPressed: { backgroundColor: "#F3F4F6" },
  locationButtonText: { ...typography.label, color: colors.text },
  statusText: { ...typography.caption, color: colors.textMuted },
});
