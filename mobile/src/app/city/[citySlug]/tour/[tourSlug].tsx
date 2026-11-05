import { useState } from "react";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import type { PublicCitySummaryResponse, PublicTour, PublicPlaceCard } from "../../../../lib/api/contracts";
import { ContentRecovery } from "../../../../components/ContentRecovery";
import { CitywalkLoading } from "../../../../components/CitywalkLoading";
import { NativeCityMap } from "../../../../components/NativeCityMap";
import { NativeContentImage } from "../../../../components/NativeContentImage";
import { MediaAttribution } from "../../../../components/MediaAttribution";
import { NativeIcon } from "../../../../components/NativeIcon";
import { AppText, PressableSurface, PrimaryButton, Screen, StatusMessage } from "../../../../components/ui";
import { colors } from "../../../../design/tokens";
import { nativeContentTextStyle, nativeRowStyle } from "../../../../design/rtlPresentation";
import { usePublicCity } from "../../../../hooks/usePublicContent";
import { nativeCityName, nativePlaceName } from "../../../../lib/displayNames";
import { citywalkApi } from "../../../../lib/api/instance";
import { explorePhotography } from "../../../../lib/explorePhotography";
import { photoCreditEntries, photoCreditsCopy } from "../../../../lib/photoCredits";
import { routesCopy } from "../../../../lib/publishedRoutes";
import { publishedRouteTiming } from "../../../../lib/publishedRouteTiming";
import { routePreviewCopy } from "../../../../lib/routePreviewCopy";
import { parseTourRouteIdentity, resolveTourForRoute } from "../../../../lib/routing";
import { CuratedTourControls } from "../../../../components/CuratedTourControls";
import { useNativeLocale } from "../../../../localization/LocaleProvider";

export default function TourScreen() {
  const params = useLocalSearchParams<{ citySlug?: string | string[]; tourSlug?: string | string[] }>();
  const identity = parseTourRouteIdentity(params.citySlug, params.tourSlug);
  const { locale, messages } = useNativeLocale();
  const state = usePublicCity(identity?.citySlug ?? "invalid", locale);
  if (!identity) return <Screen navigation={false}><StatusMessage>{messages.unavailable}</StatusMessage></Screen>;
  if (state.status === "loading") return <Screen navigation={false}><CitywalkLoading variant="city" /></Screen>;
  if (state.status === "error") return <Screen navigation={false}><ContentRecovery retry={state.retry} citySlug={identity.citySlug} /></Screen>;
  const tour = resolveTourForRoute(state.data, identity);
  if (!tour) return <Screen navigation={false}><StatusMessage>{messages.unavailable}</StatusMessage></Screen>;
  return <RoutePreview key={`${identity.citySlug}:${tour.slug}`} data={state.data} tour={tour} />;
}

function RoutePreview({ data, tour }: { data: PublicCitySummaryResponse; tour: PublicTour }) {
  const { locale, direction, messages } = useNativeLocale();
  const copy = routePreviewCopy(locale);
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale > 1.5;
  const [selected, setSelected] = useState<string>();
  const [timingExpanded, setTimingExpanded] = useState(false);
  const timing = publishedRouteTiming(tour);
  const ordered = [...tour.stops].sort((a, b) => a.position - b.position);
  const stops = ordered.flatMap(stop => {
    const place = data.places.find(p => p.slug === stop.placeSlug);
    return place ? [{ stop, place }] : [];
  });
  const complete = stops.length > 0 && stops.length === ordered.length;
  const tripIdentity = { id: `published-${tour.slug}`, citySlug: data.city.slug, stopSlugs: stops.map(({place}) => place.slug), source: "published" as const };
  const selectedPlace = stops.find(({place}) => place.slug === selected)?.place;
  const citySlug = data.city.slug;
  const textStyle = nativeContentTextStyle(locale, tour.resolvedLocale);
  const photoStops = stops.filter(({place}) => explorePhotography(citySlug, place));
  return <Screen key={`route-preview-${fontScale}`} navigation={false} footer={complete ? <CuratedTourControls citySlug={tripIdentity.citySlug} tourSlug={tour.slug} stopSlugs={tripIdentity.stopSlugs} renderStart={({ busy, disabled, onPress }) => (
    <PrimaryButton label={copy.start} busy={busy} disabled={disabled} onPress={onPress} labelStyle={largeText ? { fontSize: 15 * Math.min(fontScale, 2) / fontScale, lineHeight: 22 * Math.min(fontScale, 2) / fontScale } : undefined} haptic="medium" leadingIcon={largeText ? undefined : <NativeIcon ios="figure.walk" android="directions_walk" color="#FFFFFF" size={20} />} />
  )} /> : <PrimaryButton disabled label={copy.start} />}>
    <Stack.Screen options={{ title: tour.content.title }} />
    <View style={styles.headingBlock}>
      <AppText variant="caption" style={styles.city}>{nativeCityName(citySlug, data.city.content.name, locale)} · {copy.walking}</AppText>
      <AppText accessibilityRole="header" maxFontSizeMultiplier={2} style={[styles.title, largeText && styles.largeTitle, fontScale > 2.5 && styles.largestTitle, textStyle]}>{tour.content.title}</AppText>
      <View style={[styles.summary, nativeRowStyle(direction)]}>
        <NativeIcon ios="clock" android="schedule" color={colors.primary} size={17} />
        <AppText variant="metadata" style={styles.muted}>{timing.visitMinutes !== undefined ? copy.visits.replace("{minutes}", String(timing.visitMinutes)) : copy.visitsUnknown} · {tour.stops.length} {messages.stops}</AppText>
      </View>
      <PressableSurface accessibilityRole="button" accessibilityLabel={copy.timingDetails} accessibilityState={{ expanded: timingExpanded }} onPress={() => setTimingExpanded(value => !value)} style={styles.timingToggle}>
        <AppText variant="caption" style={styles.timingLabel}>{copy.timing}</AppText><NativeIcon ios={timingExpanded ? "chevron.up" : "chevron.down"} android={timingExpanded ? "expand_less" : "expand_more"} size={15} color={colors.primary} />
      </PressableSurface>
      {timingExpanded ? <View style={styles.timingDetails}>
        <AppText variant="caption" style={styles.muted}>{copy.timingHelp}</AppText>
        {timing.publishedMinutes !== undefined ? <AppText variant="caption" style={styles.muted}>{copy.published.replace("{minutes}", String(timing.publishedMinutes))}</AppText> : null}
        {timing.conflictsWithVisits ? <AppText variant="caption" style={styles.muted}>{copy.conflict}</AppText> : null}
      </View> : null}
      {tour.didFallback ? <AppText variant="caption" style={styles.muted}>{messages.fallbackContent}</AppText> : null}
    </View>
    {complete ? <View style={styles.mapBlock}>
      <NativeCityMap citySlug={citySlug} places={stops.map(({place}) => place)} currentSlug={selected}
        routeOverview={{ fitLabel: copy.fit, stopLabel: copy.stop }} onSelectPlace={setSelected} />
      <AppText variant="caption" style={styles.muted}>{copy.schematic}</AppText>
      {selectedPlace ? <View accessibilityLiveRegion="polite" style={styles.selection}>
        <AppText variant="caption" style={styles.muted}>{copy.selected}</AppText>
        <Link href={{ pathname: "/city/[citySlug]/place/[placeSlug]", params: {citySlug, placeSlug: selectedPlace.slug} }} asChild>
          <PrimaryButton tone="secondary" label={`${copy.browse}: ${nativePlaceName(citySlug, selectedPlace.slug, selectedPlace.content.name, locale)}`} />
        </Link>
      </View> : null}
    </View> : <StatusMessage>{copy.unavailable}</StatusMessage>}
    <AppText accessibilityRole="header" style={styles.sectionTitle}>{copy.stops}</AppText>
    <View style={styles.stopList}>{stops.map(({stop, place}, index) => <Link key={`${stop.position}-${place.slug}`}
      href={{ pathname: "/city/[citySlug]/place/[placeSlug]", params: { citySlug, placeSlug: place.slug } }} asChild>
      <PressableSurface accessibilityRole="link" accessibilityLabel={`${copy.stop} ${index+1}: ${nativePlaceName(citySlug, place.slug, place.content.name, locale)}${stop.visitDurationMinutes ? ` · ${stop.visitDurationMinutes} ${messages.visitMinutes}` : ""}`}
        style={StyleSheet.flatten([styles.stopCard, {direction}, largeText && styles.largeStop, selected === place.slug && styles.selectedStop])}>
        <View style={styles.number}><AppText allowFontScaling={false} style={styles.numberText}>{index+1}</AppText></View>
        <View style={styles.stopCopy}><AppText style={[styles.stopName, fontScale > 2.5 && styles.largestStopName, nativeContentTextStyle(locale, place.resolvedLocale)]}>{nativePlaceName(citySlug, place.slug, place.content.name, locale)}</AppText>
          {stop.visitDurationMinutes ? <AppText variant="caption" style={styles.muted}>{stop.visitDurationMinutes} {messages.visitMinutes}</AppText> : null}
        </View><NativeIcon ios={direction === "rtl" ? "chevron.left" : "chevron.right"} android={direction === "rtl" ? "chevron_left" : "chevron_right"} color={colors.textMuted} size={16} />
      </PressableSurface>
    </Link>)}</View>
    {photoStops.length ? <View style={styles.photoRow}>{photoStops.slice(0, 3).map(({place}) => <StopPhoto key={place.slug} citySlug={citySlug} place={place} />)}</View> : null}
    {tour.content.description || tour.content.shortDescription ? <View style={styles.about}>
      <AppText accessibilityRole="header" style={styles.sectionTitle}>{copy.description}</AppText>
      <AppText style={[styles.muted, textStyle]}>{tour.content.description ?? tour.content.shortDescription}</AppText>
    </View> : null}
    <View style={styles.returnInfo}><AppText variant="caption" style={styles.muted}>{copy.noReturn}</AppText>
      <Link href={{ pathname: "/city/[citySlug]/walk", params: { citySlug } }} asChild><PrimaryButton tone="secondary" label={copy.build} /></Link>
    </View>
    <Link href={{ pathname: "/city/[citySlug]/routes", params: { citySlug } }} dismissTo asChild><PrimaryButton tone="secondary" label={routesCopy(locale).more} /></Link>
  </Screen>;
}

function StopPhoto({ citySlug, place }: { citySlug: string; place: PublicPlaceCard }) {
  const { locale } = useNativeLocale();
  const photo = explorePhotography(citySlug, place);
  if (!photo) return null;
  const central = photo.credit ? photoCreditEntries.find(entry => entry.source === photo.credit?.source) : undefined;
  return <View style={styles.photoItem}>
    <Link href={{ pathname: "/city/[citySlug]/place/[placeSlug]", params: { citySlug, placeSlug: place.slug } }} asChild><PressableSurface accessibilityRole="link" accessibilityLabel={nativePlaceName(citySlug, place.slug, place.content.name, locale)} style={styles.photoLink}>
      <NativeContentImage source={photo.uri ? {uri:citywalkApi.resolveUrl(photo.uri)} : photo.source} style={styles.photo} contentFit="cover" cachePolicy="memory-disk" accessibilityLabel={nativePlaceName(citySlug, place.slug, place.content.name, locale)} />
    </PressableSurface></Link>
    {central ? <Link href={{ pathname: "/photo-credits", params: { image: central.id } }} asChild><PressableSurface accessibilityRole="link" style={styles.credit}><AppText style={styles.creditText}>{photoCreditsCopy(locale).title}</AppText></PressableSurface></Link> : <MediaAttribution attribution={photo.attribution} />}
  </View>;
}
const styles = StyleSheet.create({
  largeTitle: { fontSize: 22, lineHeight: 29 }, largestTitle: { fontSize: 16, lineHeight: 22 },
  largeStop: { flexDirection: "column", alignItems: "stretch" }, largestStopName: { fontSize: 12, lineHeight: 18 },
  timingToggle: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8 }, timingLabel: { flexShrink: 1, color: colors.primary }, timingDetails: { padding: 14, borderRadius: 16, backgroundColor: colors.primarySoft, gap: 8 },
  headingBlock: { gap: 8 }, city: { color: colors.primary, fontWeight: "600" },
  title: { fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", fontWeight: "700", color: colors.text, fontSize: 30, lineHeight: 36, letterSpacing: -0.5 },
  summary: { alignItems: "center", gap: 7, flexWrap: "wrap" }, muted: { color: colors.textMuted },
  mapBlock: { gap: 8 }, selection: { gap: 6 },
  photoRow: { flexDirection: "row", gap: 8 }, photoItem: { flex: 1, minWidth: 0 }, photoLink: { borderRadius: 18, overflow: "hidden", minHeight: 44 }, photo: { height: 104, width: "100%", backgroundColor: colors.primarySoft },
  credit: { minHeight: 44, justifyContent: "center" }, creditText: { fontSize: 12, lineHeight: 18, color: colors.primary, textDecorationLine: "underline" },
  about: { gap: 8 }, sectionTitle: { color: colors.text, fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", fontSize: 23, lineHeight: 29, fontWeight: "700" },
  stopList: { gap: 8 }, stopCard: { minHeight: 72, padding: 14, gap: 12, flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 18 },
  selectedStop: { backgroundColor: colors.primarySoft }, number: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }, numberText: { color: "#FFFFFF", fontSize: 14, lineHeight: 20, fontWeight: "600" },
  stopCopy: { flex: 1, gap: 4 }, stopName: { color: colors.text, fontSize: 16, lineHeight: 22, fontWeight: "600" }, returnInfo: { gap: 10 },
});
