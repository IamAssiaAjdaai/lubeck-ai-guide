import { useCallback, useRef, useState } from "react";
import { Link, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform, StyleSheet, View, useWindowDimensions, type ScrollView } from "react-native";
import { curatedResumeIndex, type CuratedProgress } from "@citywalk/traveler-core";
import type { PublicCitySummaryResponse, PublicPlaceCard } from "../lib/api/contracts";
import type { MobileTripContext } from "../lib/tripNavigation";
import { resolveActivePublishedTrip } from "../lib/activePublishedTrip";
import { activeWalkCopy } from "../lib/activeWalkCopy";
import { changeCuratedExecutionState, openCuratedProgress, updateCuratedProgress } from "../lib/curatedProgressStorage";
import { usePublicCity } from "../hooks/usePublicContent";
import { useNativeLocale } from "../localization/LocaleProvider";
import { nativeCityName, nativePlaceName } from "../lib/displayNames";
import { nativeContentTextStyle } from "../design/rtlPresentation";
import { explorePhotography } from "../lib/explorePhotography";
import { photoCreditEntries, photoCreditsCopy } from "../lib/photoCredits";
import { citywalkApi } from "../lib/api/instance";
import { colors, spacing } from "../design/tokens";
import { AppText, PressableSurface, PrimaryButton, Screen, StatusMessage } from "./ui";
import { NativeCityMap } from "./NativeCityMap";
import { NativeIcon } from "./NativeIcon";
import { NativeContentImage } from "./NativeContentImage";
import { MediaAttribution } from "./MediaAttribution";
import { CitywalkLoading } from "./CitywalkLoading";
import { ContentRecovery } from "./ContentRecovery";

export function PublishedActiveWalk({ trip }: { trip: MobileTripContext }) {
  const { locale } = useNativeLocale();
  const state = usePublicCity(trip.citySlug, locale);
  const copy = activeWalkCopy(locale);
  if (state.status === "loading") return <Screen navigation={false}><CitywalkLoading variant="city" /></Screen>;
  if (state.status === "error") return <Screen navigation={false}><ContentRecovery citySlug={trip.citySlug} retry={state.retry} /></Screen>;
  const resolved = resolveActivePublishedTrip(state.data, trip);
  if (!resolved) return <Screen navigation={false}><StatusMessage>{copy.invalid}</StatusMessage></Screen>;
  return <ActiveContent key={`${trip.citySlug}:${resolved.tour.slug}`} data={state.data} resolved={resolved} />;
}

function ActiveContent({ data, resolved }: { data: PublicCitySummaryResponse; resolved: NonNullable<ReturnType<typeof resolveActivePublishedTrip>> }) {
  const { locale, messages, direction } = useNativeLocale();
  const { fontScale, width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [actionSizes, setActionSizes] = useState<Record<string, { primary?: number; secondary?: number }>>({});
  const copy = activeWalkCopy(locale), citySlug = data.city.slug;
  const { tour, stops } = resolved;
  const signature = JSON.stringify(stops.map(({ place }) => place.slug));
  const [progress, setProgress] = useState<CuratedProgress>();
  const [busy, setBusy] = useState(true), [error, setError] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false), [selected, setSelected] = useState<string>();
  const request = useRef(0), writeLock = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const reload = useCallback(async () => {
    const version = ++request.current;
    setBusy(true); setError(false);
    try {
      // This component is reached only through the existing explicit published Start action.
      const stored = await openCuratedProgress(citySlug, tour.slug, JSON.parse(signature));
      if (version === request.current) setProgress(stored);
    } catch { if (version === request.current) setError(true); }
    finally { if (version === request.current) setBusy(false); }
  }, [citySlug, tour.slug, signature]);
  useFocusEffect(useCallback(() => {
    void reload();
    return () => { request.current += 1; };
  }, [reload]));
  async function write(operation: () => Promise<CuratedProgress>) {
    if (busy || error || writeLock.current) return;
    writeLock.current = true; setBusy(true);
    const version = request.current;
    try {
      const next = await operation();
      if (version === request.current) { setProgress(next); setSelected(undefined); setConfirmEnd(false); }
    } catch { if (version === request.current) { setError(true); scroll.current?.scrollTo({ y: 0, animated: true }); } }
    finally { writeLock.current = false; if (version === request.current) setBusy(false); }
  }
  const cursor = progress ? curatedResumeIndex(progress) : -1;
  const complete = Boolean(progress && cursor < 0);
  const phase = progress?.executionState ?? "active";
  const running = Boolean(progress && !complete && phase === "active");
  const current = cursor >= 0 ? stops[cursor] : undefined;
  const visited = progress?.statuses.filter(status => status === "visited").length ?? 0;
  const skipped = progress?.statuses.filter(status => status === "skipped").length ?? 0;
  const remaining = stops.length - visited - skipped;
  const selectedPlace = stops.find(({ place }) => place.slug === selected)?.place;
  const preview = { pathname: "/city/[citySlug]/tour/[tourSlug]", params: { citySlug, tourSlug: tour.slug } } as const;
  const title = complete ? copy.complete : phase === "paused" ? copy.paused : phase === "ended" ? copy.ended : copy.active;
  const stacked = width < 390 || fontScale > 1.5;
  const measurementKey = `${width}:${height}:${fontScale}:${locale}:${phase}:${running}`;
  const measured = actionSizes[measurementKey];
  const safeHeight = Math.max(0, height - insets.top - insets.bottom);
  // Screen owns the non-overlay footer and its spacing.sm vertical padding.
  // Measure both action groups wherever they render; moving them must not oscillate.
  const secondaryInBody = Boolean(measured?.primary !== undefined && measured?.secondary !== undefined
    && measured.primary + measured.secondary + spacing.sm + 2 * spacing.sm > safeHeight / 3);
  function measureAction(group: "primary" | "secondary", measuredHeight: number) {
    setActionSizes(previous => previous[measurementKey]?.[group] === measuredHeight ? previous
      : { [measurementKey]: { ...previous[measurementKey], [group]: measuredHeight } });
  }
  const secondaryActions = progress && !complete && phase !== "ended" ? <View
    onLayout={event => measureAction("secondary", event.nativeEvent.layout.height)}
    style={[styles.controls, stacked && styles.largeControls]}>
    {running ? <PrimaryButton label={copy.pause} tone="secondary" disabled={busy || error} style={[styles.control, stacked && styles.largeControl]} onPress={() => void write(() => changeCuratedExecutionState(progress, "paused"))} /> : null}
    <PrimaryButton label={locale === "de" ? "Beenden" : "End walk"} accessibilityLabel={copy.end} tone="secondary" disabled={busy || error} style={[styles.control, stacked && styles.largeControl]} onPress={() => { setConfirmEnd(true); scroll.current?.scrollTo({ y: 0, animated: true }); }} />
  </View> : null;
  const footer = progress && !complete ? <View style={styles.footer}>
    <View onLayout={event => measureAction("primary", event.nativeEvent.layout.height)}>
      <PrimaryButton label={running ? copy.mark : copy.resume} style={fontScale > 1.5 ? styles.largeAction : undefined} busy={busy} disabled={error}
        onPress={() => void write(() => running ? updateCuratedProgress(progress, cursor, "visited") : changeCuratedExecutionState(progress, "active"))} />
    </View>
    {!secondaryInBody ? secondaryActions : null}
  </View> : undefined;
  return <Screen key={`active-walk-${fontScale}`} scrollViewRef={scroll} navigation={false} footer={footer}>
    <View style={styles.heading}>
      <AppText variant="caption" style={styles.eyebrow}>{nativeCityName(citySlug, data.city.content.name, locale)} · {title}</AppText>
      <AppText accessibilityRole="header" style={[styles.routeTitle, nativeContentTextStyle(locale, tour.resolvedLocale)]}>{tour.content.title}</AppText>
      {phase === "paused" && !complete ? <View style={[styles.pausedIndicator, fontScale > 1.5 && styles.stacked]}><NativeIcon ios="pause.circle.fill" android="pause_circle_filled" size={24} color={colors.primary} /><AppText style={styles.pausedLabel}>{copy.paused}</AppText></View> : null}
      {progress ? <View style={styles.progress}>
        <AppText variant="metadata" style={styles.cursorLabel}>{current ? `${copy.progress.replace("{current}", String(cursor + 1)).replace("{total}", String(stops.length))} · ${nativePlaceName(citySlug, current.place.slug, current.place.content.name, locale)}` : `${visited} ${copy.visited}${skipped ? ` · ${skipped} ${copy.skipped}` : ""} · ${remaining} ${copy.remaining}`}</AppText>
        <View accessibilityRole="progressbar" accessibilityLabel={copy.stops} accessibilityValue={{ min: 0, max: stops.length, now: visited + skipped }} style={styles.track}><View style={[styles.fill, { width: `${(visited + skipped) / stops.length * 100}%` }]} /></View>
      </View> : null}
    </View>
    {error ? <View accessibilityRole="alert" style={styles.message}><AppText>{copy.error}</AppText><PrimaryButton label={copy.retry} disabled={busy} tone="secondary" onPress={() => void reload()} /></View> : null}
    {!progress && busy ? <CitywalkLoading variant="city" /> : null}
    {confirmEnd && progress ? <View style={styles.message}><AppText accessibilityRole="header" style={styles.stopName}>{copy.endQuestion}</AppText><AppText style={styles.muted}>{copy.endHelp}</AppText>
      <PrimaryButton label={copy.end} disabled={busy || error} onPress={() => void write(() => changeCuratedExecutionState(progress, "ended"))} />
      <PrimaryButton label={copy.keep} tone="secondary" disabled={busy} onPress={() => setConfirmEnd(false)} />
    </View> : null}
    {progress && (phase === "paused" || phase === "ended" || complete) ? <StatusMessage>{complete ? copy.completedHelp : phase === "ended" ? copy.endHelp : copy.pausedHelp}</StatusMessage> : null}
    {progress && !complete && phase !== "ended" ? <>
      <View style={styles.mapBlock}>
        <AppText accessibilityRole="header" variant="caption" style={styles.eyebrow}>{copy.overview}</AppText>
        <NativeCityMap citySlug={citySlug} places={stops.map(({ place }) => place)} currentSlug={current?.place.slug}
          routeOverview={{ fitLabel: copy.fit, stopLabel: copy.stop }} onSelectPlace={setSelected} followUserLocation={running && !error} />
        <AppText variant="caption" style={styles.muted}>{copy.overviewHelp}</AppText>
      </View>
      {selectedPlace ? <View style={styles.message}><AppText variant="caption" style={styles.muted}>{copy.selected}</AppText><StopLink citySlug={citySlug} place={selectedPlace} label={`${copy.details}: ${nativePlaceName(citySlug, selectedPlace.slug, selectedPlace.content.name, locale)}`} /></View> : null}
      {current ? <View style={styles.currentCard}>
        <View style={styles.currentBanner}><NativeIcon ios="mappin.circle.fill" android="place" color="#FFFFFF" size={20} /><AppText style={styles.currentLabel}>{copy.progress.replace("{current}", String(cursor + 1)).replace("{total}", String(stops.length))}</AppText></View>
        <View style={[styles.currentBody, { direction }, stacked && styles.stacked]}>
          <CurrentPhoto citySlug={citySlug} place={current.place} />
          <View style={styles.currentCopy}><AppText variant="caption" style={styles.eyebrow}>{copy.current}</AppText>
            <AppText style={styles.stopName}>{nativePlaceName(citySlug, current.place.slug, current.place.content.name, locale)}</AppText>
            <AppText variant="caption" style={styles.muted}>{current.stop.visitDurationMinutes ? `${current.stop.visitDurationMinutes} ${messages.visitMinutes}` : copy.unknown}</AppText>
          </View>
        </View>
        <StopLink citySlug={citySlug} place={current.place} label={copy.details} />
        {running ? <PrimaryButton tone="secondary" label={copy.skip} disabled={busy || error} onPress={() => void write(() => updateCuratedProgress(progress, cursor, "skipped"))} /> : null}
      </View> : null}
    </> : null}
    {secondaryInBody ? secondaryActions : null}
    {progress ? <>
      {!error ? <AppText variant="caption" style={styles.muted}>{copy.saved}</AppText> : null}
      <AppText accessibilityRole="header" style={styles.sectionTitle}>{copy.stops}</AppText>
      <View style={styles.stops}>{stops.map(({ place }, index) => <Link key={place.slug} href={{ pathname: "/city/[citySlug]/place/[placeSlug]", params: { citySlug, placeSlug: place.slug } }} asChild>
        <PressableSurface accessibilityRole="link" accessibilityLabel={`${index + 1}. ${nativePlaceName(citySlug, place.slug, place.content.name, locale)} · ${progress.statuses[index] === "visited" ? copy.visited : progress.statuses[index] === "skipped" ? copy.skipped : index === cursor ? copy.current : copy.remaining}`}
          style={StyleSheet.flatten([styles.stopRow, index === cursor && styles.currentRow, { direction }])}>
          <View style={[styles.number, { minWidth: Math.max(30, 13 * fontScale + 14), minHeight: Math.max(30, 18 * fontScale + 12), borderRadius: Math.max(15, (18 * fontScale + 12) / 2) }, index === cursor && styles.currentNumber]}><AppText style={[styles.numberText, index === cursor && styles.white]}>{progress.statuses[index] === "visited" ? "✓" : index + 1}</AppText></View>
          <View style={styles.currentCopy}><AppText style={styles.rowTitle}>{nativePlaceName(citySlug, place.slug, place.content.name, locale)}</AppText><AppText variant="caption" style={styles.muted}>{progress.statuses[index] === "visited" ? copy.visited : progress.statuses[index] === "skipped" ? copy.skipped : index === cursor ? copy.current : copy.remaining}</AppText></View>
          <NativeIcon ios="chevron.right" android="chevron_right" size={16} color={colors.primary} />
        </PressableSurface>
      </Link>)}</View>
    </> : null}
    <View style={styles.bottomActions}>
    <Link href={preview} dismissTo asChild><PrimaryButton label={copy.preview} tone="secondary" /></Link>
    <Link href={{ pathname: "/city/[citySlug]", params: { citySlug } }} asChild><PrimaryButton label={copy.city} tone="secondary" /></Link>
    </View>
  </Screen>;
}
function StopLink({ citySlug, place, label }: { citySlug: string; place: PublicPlaceCard; label: string }) {
  return <Link href={{ pathname: "/city/[citySlug]/place/[placeSlug]", params: { citySlug, placeSlug: place.slug } }} asChild><PrimaryButton label={label} tone="secondary" /></Link>;
}
function CurrentPhoto({ citySlug, place }: { citySlug: string; place: PublicPlaceCard }) {
  const { locale } = useNativeLocale();
  const { fontScale, width } = useWindowDimensions();
  const stacked = width < 390 || fontScale > 1.5;
  const photo = explorePhotography(citySlug, place);
  if (!photo) return null;
  const credit = photo.credit ? photoCreditEntries.find(entry => entry.source === photo.credit?.source) : undefined;
  return <View style={[styles.photoFrame, stacked && { width: "100%" }]}><NativeContentImage source={photo.uri ? { uri: citywalkApi.resolveUrl(photo.uri) } : photo.source} style={[styles.photo, stacked && { width: "100%", height: 120 }]} contentFit="cover" accessibilityLabel={nativePlaceName(citySlug, place.slug, place.content.name, locale)} />
    {credit ? <Link href={{ pathname: "/photo-credits", params: { image: credit.id } }} asChild><PressableSurface accessibilityRole="link" style={styles.credit}><AppText style={styles.creditText}>{photoCreditsCopy(locale).title}</AppText></PressableSurface></Link> : <MediaAttribution attribution={photo.attribution} />}
  </View>;
}
const styles = StyleSheet.create({
  heading: { gap: 16 }, eyebrow: { color: colors.primary, fontWeight: "600" }, muted: { color: colors.textMuted },
  routeTitle: { fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", fontSize: 24, lineHeight: 30, color: colors.text, fontWeight: "700", letterSpacing: -0.4 },
  cursorLabel: { color: colors.primary, fontWeight: "600" }, progress: { gap: 8 }, track: { height: 5, borderRadius: 3, backgroundColor: colors.primarySoft, overflow: "hidden" }, fill: { height: "100%", backgroundColor: colors.primary },
  sectionTitle: { fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", fontSize: 22, lineHeight: 28, color: colors.text, fontWeight: "700" }, mapBlock: { gap: 8 },
  currentCard: { gap: 16, backgroundColor: "#FFFFFF", padding: 14, borderRadius: 22 }, currentBanner: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: colors.text, borderRadius: 13, padding: 12 }, currentLabel: { color: "#FFFFFF", fontSize: 14, lineHeight: 20, fontWeight: "600", flexShrink: 1 },
  currentBody: { flexDirection: "row", alignItems: "center", gap: 14 }, stacked: { flexDirection: "column", alignItems: "stretch" }, currentCopy: { flex: 1, minWidth: 0, gap: 4 }, stopName: { color: colors.text, fontSize: 21, lineHeight: 27, fontWeight: "700" },
  photoFrame: { width: 96 }, photo: { width: 96, height: 84, borderRadius: 14 }, credit: { minHeight: 44, justifyContent: "center" }, creditText: { color: colors.primary, fontSize: 11, lineHeight: 16, textDecorationLine: "underline" },
  largeAction: { paddingHorizontal: 8 },
  pausedIndicator: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 14, backgroundColor: colors.primarySoft }, pausedLabel: { color: colors.primary, fontWeight: "700", flexShrink: 1 },
  bottomActions: { gap: 16, paddingBottom: 16 },
  largeControls: { flexDirection: "column", flexWrap: "nowrap", alignItems: "stretch" }, largeControl: { flexBasis: "auto" },
  footer: { gap: 8 }, controls: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, control: { flexGrow: 1, flexBasis: "44%" }, message: { borderRadius: 18, backgroundColor: colors.primarySoft, padding: 16, gap: 12 },
  stops: { gap: 8 }, stopRow: { minHeight: 68, padding: 12, borderRadius: 18, backgroundColor: "#FFFFFF", flexDirection: "row", gap: 12, alignItems: "center" }, currentRow: { backgroundColor: colors.primarySoft }, number: { minWidth: 30, minHeight: 30, paddingHorizontal: 7, paddingVertical: 6, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }, currentNumber: { backgroundColor: colors.primary }, numberText: { color: colors.primary, fontSize: 13, lineHeight: 18, fontWeight: "600" }, white: { color: "#FFFFFF" }, rowTitle: { color: colors.text, fontSize: 15, lineHeight: 21, fontWeight: "600" },
});
