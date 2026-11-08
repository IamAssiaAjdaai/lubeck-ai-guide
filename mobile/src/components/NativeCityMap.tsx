import { uxCopy } from "../design/uxCopy";
import { nativePlaceName } from "../lib/displayNames";
import { Camera, Map, Marker, GeoJSONSource, Layer, type CameraRef } from "@maplibre/maplibre-react-native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../design/tokens";
import type { PublicPlaceCard } from "../lib/api/contracts";
import type { NativeMessages } from "../lib/localization";
import {
  recheckForegroundLocationProvider,
  requestForegroundLocation,
  type NativeLocationStatus,
  type NativeUserLocation,
} from "../lib/location";
import { expoForegroundLocationAdapter } from "../lib/location.expo";
import { resolveMapStyleUrl } from "../lib/mapStyle";
import { triggerCitywalkHaptic } from "../lib/haptics";
import { useNativeLocale } from "../localization/LocaleProvider";
import { walkCopy } from "@citywalk/traveler-core/walkCopy";
import { AppText, PrimaryButton } from "./ui";
import { NativeIcon } from "./NativeIcon";

const MAP_STYLE_URL = resolveMapStyleUrl();

export function NativeCityMap({ citySlug, places, routeStart, routeFinish, currentSlug, onLocation, followUserLocation = false, compact = false, previewCompact = false, liveFocus = false, routeOverview, onSelectPlace }: Readonly<{
  /** Opt-in published stop-order diagram; never street-level walking directions. */
  routeOverview?: { fitLabel: string; stopLabel: string };
  onSelectPlace?: (slug: string) => void;
  citySlug?: string;
  places: readonly PublicPlaceCard[];
  routeStart?: { lat: number; lng: number };
  routeFinish?: { lat: number; lng: number };
  currentSlug?: string;
  onLocation?: (point: { lat: number; lng: number }) => void;
  followUserLocation?: boolean;
  compact?: boolean;
  previewCompact?: boolean;
  liveFocus?: boolean;
}>) {
  const { messages, locale } = useNativeLocale();
  const cameraRef = useRef<CameraRef>(null);
  const onLocationRef = useRef(onLocation);
  const [locationStatus, setLocationStatus] = useState<NativeLocationStatus>("idle");
  const [userLocation, setUserLocation] = useState<NativeUserLocation>();
  const [mapFailed, setMapFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const line = [...(routeStart ? [routeStart] : []), ...places.map(p => p.coordinates), ...(routeFinish ? [routeFinish] : [])].map(p => [p.lng, p.lat]);
  useEffect(() => {
    if (loaded || mapFailed) return;
    const timer = setTimeout(() => setMapFailed(true), 30000);
    return () => clearTimeout(timer);
  }, [attempt, loaded, mapFailed]);
  const bounds: [number, number, number, number] | undefined = places.length ? [
    Math.min(...places.map(p => p.coordinates.lng)), Math.min(...places.map(p => p.coordinates.lat)),
    Math.max(...places.map(p => p.coordinates.lng)), Math.max(...places.map(p => p.coordinates.lat)),
  ] : undefined;
  const fitOverview = () => {
    if (bounds) cameraRef.current?.fitBounds(bounds, { padding: { top: 48, bottom: 48, left: 48, right: 48 }, duration: 0 });
  };
  const appState = useRef(AppState.currentState);
  const initialCenter: [number, number] = routeStart ? [routeStart.lng, routeStart.lat] : places[0]
    ? [places[0].coordinates.lng, places[0].coordinates.lat]
    : [0, 0];
  const statusMessage = getLocationStatusMessage(locationStatus, messages);
  const hasUserLocation = Boolean(userLocation);

  useEffect(() => {
    onLocationRef.current = onLocation;
  }, [onLocation]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const returningToForeground = appState.current !== "active" && nextState === "active";
      appState.current = nextState;
      if (!returningToForeground || (
        locationStatus !== "services_disabled" && locationStatus !== "provider_unavailable"
      )) return;

      void recheckForegroundLocationProvider(expoForegroundLocationAdapter)
        .then((provider) => {
          setLocationStatus(provider === "ready" ? "idle" : provider);
        });
    });
    return () => subscription.remove();
  }, [locationStatus]);

  useEffect(() => {
    if (
      !followUserLocation ||
      !hasUserLocation ||
      !expoForegroundLocationAdapter.watchPosition
    ) return;

    let alive = true;
    let stopWatching: (() => void) | undefined;
    void expoForegroundLocationAdapter.watchPosition((location) => {
      if (!alive) return;
      setUserLocation(location);
      onLocationRef.current?.({
        lat: location.latitude,
        lng: location.longitude,
      });
    }).then((stop) => {
      if (!alive) {
        stop();
        return;
      }
      stopWatching = stop;
    }).catch(() => undefined);

    return () => {
      alive = false;
      stopWatching?.();
    };
  }, [followUserLocation, hasUserLocation]);

  async function handleLocationRequest() {
    void triggerCitywalkHaptic("light");
    setLocationStatus("requesting");
    const result = await requestForegroundLocation(expoForegroundLocationAdapter);
    setLocationStatus(result.status);
    if (result.status === "available") {
      setUserLocation(result.location);
      onLocation?.({ lat: result.location.latitude, lng: result.location.longitude });
      cameraRef.current?.easeTo({ center: [result.location.longitude, result.location.latitude], zoom: 15, duration: 350 });
    }
  }

  async function handleLocationSettings() {
    try {
      await expoForegroundLocationAdapter.openLocationSettings?.();
    } catch {
      setLocationStatus("error");
    }
  }

  return (
    <View style={styles.shell}>
      {mapFailed ? (
        <View accessibilityRole="alert" style={[styles.fallback, routeOverview && styles.overviewMap, compact && styles.compactMap, previewCompact && styles.previewCompactMap, liveFocus && styles.liveMap]}>
          <AppText variant="caption" style={styles.statusText}>{walkCopy(locale).mapUnavailable}</AppText>
          <AppText>{walkCopy(locale).mapFallbackHelp}</AppText>
          <PrimaryButton label={walkCopy(locale).retry} onPress={() => { setLoaded(false); setMapFailed(false); setAttempt(v => v + 1); }} />
        </View>
      ) : (
        <Map
          key={attempt}
          mapStyle={MAP_STYLE_URL}
          onDidFinishRenderingMapFully={() => { if (!loaded && routeOverview) fitOverview(); setLoaded(true); }}
          style={[styles.map, routeOverview && styles.overviewMap, compact && styles.compactMap, liveFocus && styles.liveMap]}
          compass
          attribution
          onDidFailLoadingMap={() => setMapFailed(true)}
        >
          <Camera ref={cameraRef} initialViewState={routeOverview && bounds ? { bounds, padding: { top: 48, bottom: 48, left: 48, right: 48 } } : { center: initialCenter, zoom: 13 }} />
          {routeStart && line.length > 1 ? <GeoJSONSource id="walk-route" data={{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: line } }}><Layer id="walk-route-line" type="line" paint={{ "line-color": colors.primary, "line-width": 4 }} /></GeoJSONSource> : null}
          {routeOverview && line.length > 1 ? <GeoJSONSource id="published-stop-order" data={{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: places.map(p => [p.coordinates.lng, p.coordinates.lat]) } }}><Layer id="published-stop-order-line" type="line" paint={{ "line-color": colors.primary, "line-width": 3, "line-dasharray": [2, 2] }} /></GeoJSONSource> : null}
          {routeFinish ? <Marker id="walk-finish" lngLat={[routeFinish.lng, routeFinish.lat]}><AppText accessibilityLabel={walkCopy(locale).end}>⚑</AppText></Marker> : null}
          {places.map((place, index) => (
            <Marker
              key={place.slug}
              id={`place-${place.slug}`}
              lngLat={[place.coordinates.lng, place.coordinates.lat]}
              onPress={onSelectPlace ? () => onSelectPlace(place.slug) : undefined}
              accessibilityLabel={routeOverview ? `${routeOverview.stopLabel} ${index + 1}. ${nativePlaceName(citySlug ?? "", place.slug, place.content.name, locale)}` : undefined}
              accessibilityRole={routeOverview ? "button" : undefined}
              onAccessibilityTap={onSelectPlace ? () => onSelectPlace(place.slug) : undefined}
              accessibilityActions={onSelectPlace ? [{ name: "activate" }] : undefined}
              onAccessibilityAction={onSelectPlace ? event => { if (event.nativeEvent.actionName === "activate") onSelectPlace(place.slug); } : undefined}
            >
              {routeOverview ? <Pressable
                accessible
                accessibilityRole={onSelectPlace ? "button" : undefined}
                accessibilityState={onSelectPlace ? { selected: place.slug === currentSlug } : undefined}
                onPress={onSelectPlace ? () => onSelectPlace(place.slug) : undefined}
                accessibilityLabel={`${routeOverview?.stopLabel ?? ""} ${index + 1}. ${nativePlaceName(citySlug ?? "", place.slug, place.content.name, locale)}`.trim()}
                style={routeOverview ? styles.overviewMarkerTarget : undefined}
              ><View style={[styles.placeMarker, routeOverview && styles.overviewMarker, place.slug === currentSlug && { backgroundColor: colors.success }]}><Text allowFontScaling={false} style={{ color: "white", fontSize: routeOverview ? 11 : 10, textAlign: "center", fontWeight: "600" }}>{index + 1}</Text></View></Pressable> : <View
                accessible
                accessibilityLabel={`${index + 1}. ${nativePlaceName(citySlug ?? "", place.slug, place.content.name, locale)}`}
                style={[styles.placeMarker, place.slug === currentSlug && { backgroundColor: colors.success }]}
              ><Text style={{ color: "white", fontSize: 10, textAlign: "center" }}>{index + 1}</Text></View>}
            </Marker>
          ))}
          {userLocation ? (
            <Marker id="current-user" lngLat={[userLocation.longitude, userLocation.latitude]}>
              <View accessible accessibilityLabel={messages.useLocation} style={styles.userMarker} />
            </Marker>
          ) : null}
        </Map>
      )}
      {!loaded && !mapFailed ? <View pointerEvents="none" accessibilityRole="progressbar" accessibilityLabel={uxCopy(locale).map} style={[StyleSheet.absoluteFill, styles.loadingOverlay, compact && styles.compactLoadingOverlay, previewCompact && styles.previewCompactLoadingOverlay, liveFocus && styles.liveLoadingOverlay, routeOverview && styles.overviewLoadingOverlay]}>
        <NativeIcon ios="map" android="map" color={colors.primary} size={30} />
        <ActivityIndicator color={colors.primary} />
        <AppText>{uxCopy(locale).map}</AppText>
      </View> : null}
      {routeOverview && !mapFailed ? <Pressable accessibilityRole="button" accessibilityLabel={routeOverview.fitLabel} onPress={fitOverview} style={styles.fitButton}><NativeIcon ios="arrow.up.left.and.arrow.down.right" android="zoom_out_map" color={colors.primary} size={19} /></Pressable> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={locationStatus === "requesting" ? messages.locationRequesting : messages.useLocation}
        accessibilityState={{ busy: locationStatus === "requesting", disabled: locationStatus === "requesting" }}
        disabled={locationStatus === "requesting"}
        onPress={() => void handleLocationRequest()}
        style={({ pressed }) => [
          styles.locationButton,
          (compact || previewCompact || routeOverview) && styles.compactLocationButton,
          routeOverview && styles.overviewLocationButton,
          pressed && styles.locationButtonPressed,
        ]}
      >
        <NativeIcon ios="location.fill" android="my_location" color={colors.primary} size={18} />
        {!compact && !previewCompact && !routeOverview ? (
          <Text style={styles.locationButtonText} numberOfLines={1} adjustsFontSizeToFit>
            {locationStatus === "requesting" ? messages.locationRequesting : messages.useLocation}
          </Text>
        ) : null}
      </Pressable>
      {locationStatus === "services_disabled" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={messages.turnOnLocationServices}
          onPress={() => void handleLocationSettings()}
          style={({ pressed }) => [styles.settingsButton, pressed && styles.locationButtonPressed]}
        >
          <Text style={styles.settingsButtonText}>{messages.turnOnLocationServices}</Text>
        </Pressable>
      ) : null}
      {statusMessage ? <AppText variant="caption" style={styles.statusText}>{statusMessage}</AppText> : null}
    </View>
  );
}

function getLocationStatusMessage(
  status: NativeLocationStatus,
  messages: NativeMessages,
): string | undefined {
  switch (status) {
    case "denied":
      return messages.locationDenied;
    case "services_disabled":
      return messages.locationServicesDisabled;
    case "provider_unavailable":
      return messages.locationProviderUnavailable;
    case "fix_failed":
      return messages.locationFixFailed;
    case "error":
      return messages.locationUnavailable;
    default:
      return undefined;
  }
}

const styles = StyleSheet.create({
  overviewMap: { height: 240 }, overviewLoadingOverlay: { bottom: undefined, height: 240 }, overviewLocationButton: { width: 44, minHeight: 44 },
  fitButton: { position: "absolute", top: 12, start: 12, width: 44, minHeight: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  overviewMarkerTarget: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  overviewMarker: { width: 24, height: 24, borderRadius: 12 },
  shell: { gap: spacing.sm, position: "relative" },
  map: { height: 320, borderRadius: radius.lg, overflow: "hidden" },
  compactMap: { height: 380, borderRadius: radius.md },
  previewCompactMap: { height: 208, borderRadius: radius.lg },
  liveMap: { height: 460, borderRadius: radius.md },
  fallback: { height: 320, borderRadius: radius.lg, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center", padding: spacing.lg },
  placeMarker: { width: 22, height: 22, borderRadius: radius.pill, backgroundColor: colors.mapMarker, borderWidth: 3, borderColor: colors.surface },
  userMarker: { width: 24, height: 24, borderRadius: radius.pill, backgroundColor: colors.userMarker, borderWidth: 4, borderColor: colors.surface },
  loadingOverlay: { backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", gap: spacing.sm, borderRadius: radius.lg, overflow: "hidden" },
  compactLoadingOverlay: { bottom: undefined, height: 380, borderRadius: radius.md },
  previewCompactLoadingOverlay: { bottom: undefined, height: 208, borderRadius: radius.lg },
  liveLoadingOverlay: { bottom: undefined, height: 460, borderRadius: radius.md },
  locationButton: { minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "center", paddingHorizontal: spacing.md },
  compactLocationButton: {
    position: "absolute",
    top: spacing.sm,
    end: spacing.sm,
    width: 40,
    minHeight: 40,
    paddingHorizontal: 0,
    borderRadius: radius.pill,
  },
  locationButtonPressed: { backgroundColor: "#F3F4F6" },
  locationButtonText: { ...typography.label, color: colors.text },
  settingsButton: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  settingsButtonText: { ...typography.label, color: colors.primary, textAlign: "center" },
  statusText: { ...typography.caption, color: colors.textMuted },
});