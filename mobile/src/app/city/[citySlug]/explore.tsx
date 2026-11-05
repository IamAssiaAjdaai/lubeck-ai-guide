import { useCallback, useRef, useState } from "react";
import { t as translate } from "@citywalk/i18n";
import { Link, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";

import { walkCopy } from "@citywalk/traveler-core/walkCopy";
import type { PublicCitySummaryResponse, PublicPlaceCard } from "../../../lib/api/contracts";
import { ContentRecovery } from "../../../components/ContentRecovery";
import { CitywalkLoading } from "../../../components/CitywalkLoading";
import { MediaAttribution } from "../../../components/MediaAttribution";
import { NativeCityMap } from "../../../components/NativeCityMap";
import { NativeContentImage as Image } from "../../../components/NativeContentImage";
import { NativeIcon } from "../../../components/NativeIcon";
import { WalkMembershipControl } from "../../../components/WalkMembershipControl";
import { WalkChoices } from "../../../components/WalkControls";
import {
  AppText,
  EmptyState,
  PressableSurface,
  PrimaryButton,
  Screen,
  VirtualizedScreen,
  StatusMessage,
} from "../../../components/ui";
import { discoveryCopy } from "../../../design/discoveryCopy";
import { searchCopy } from "../../../design/searchCopy";
import {
  nativeContentTextStyle,
  nativeRowStyle,
  nativeTextBlock,
} from "../../../design/rtlPresentation";
import { colors, motion, shadows } from "../../../design/tokens";
import { prefetchPublicPlace, usePublicCity } from "../../../hooks/usePublicContent";
import { citywalkApi } from "../../../lib/api/instance";
import { explorePhotography } from "../../../lib/explorePhotography";
import { loadSavedPlaces, toggleSavedPlace } from "../../../lib/walkStorage";
import { useResponsiveTextLayout } from "../../../design/responsiveText";
import { nativeCityName, nativePlaceName } from "../../../lib/displayNames";
import { triggerCitywalkHaptic } from "../../../lib/haptics";
import { parseCityRouteIdentity } from "../../../lib/routing";
import { useNativeLocale } from "../../../localization/LocaleProvider";

export default function ExploreScreen() {
  const params = useLocalSearchParams<{ citySlug?: string | string[] }>();
  const identity = parseCityRouteIdentity(params.citySlug);
  const { locale, messages } = useNativeLocale();
  const cityState = usePublicCity(identity?.citySlug ?? "invalid", locale);

  if (!identity) {
    return (
      <Screen brand={false}>
        <StatusMessage>{messages.unavailable}</StatusMessage>
      </Screen>
    );
  }
  if (cityState.status === "loading") {
    return (
      <Screen brand={false}>
        <CitywalkLoading variant="city" />
      </Screen>
    );
  }
  if (cityState.status === "error") {
    return (
      <Screen brand={false}>
        <ContentRecovery retry={cityState.retry} citySlug={identity.citySlug} />
      </Screen>
    );
  }

  return <ExploreContent key={cityState.data.city.slug} data={cityState.data} />;
}

function ExploreContent({ data: { city, places } }: { data: PublicCitySummaryResponse }) {
  const { direction, locale, messages } = useNativeLocale();
  const labels = discoveryCopy(locale), t = walkCopy(locale), searchLabels = searchCopy(locale);
  const { expanded } = useResponsiveTextLayout();
  const { fontScale } = useWindowDimensions();
  const [category, setCategory] = useState<"all" | "see" | "eat" | "fun">("all");
  const [view, setView] = useState<"list" | "map">("list");
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [saveReady, setSaveReady] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const locks = useRef(new Set<string>());
  const saveEpoch = useRef(0);
  const reloadSaved = useCallback(() => {
    const epoch = ++saveEpoch.current;
    setSaveReady(false);
    void loadSavedPlaces().then(items => {
      if (epoch === saveEpoch.current) {
        setSaved(new Set(items.filter(item => item.citySlug === city.slug).map(item => item.slug)));
        setSaveReady(true);
        setSaveError(false);
      }
    }).catch(() => { if (epoch === saveEpoch.current) setSaveError(true); });
  }, [city.slug]);
  useFocusEffect(useCallback(() => {
    reloadSaved();
    return () => { saveEpoch.current++; };
  }, [reloadSaved]));
  async function save(place: PublicPlaceCard) {
    if (!saveReady || locks.current.has(place.slug)) return;
    locks.current.add(place.slug); setBusy(new Set(locks.current)); setSaveError(false);
    try {
      const selected = await toggleSavedPlace({ citySlug: city.slug, slug: place.slug, name: place.content.name });
      setSaved(current => { const next = new Set(current); if (selected) next.add(place.slug); else next.delete(place.slug); return next; });
    } catch { setSaveError(true); }
    finally { locks.current.delete(place.slug); setBusy(new Set(locks.current)); }
  }
  const visiblePlaces = places.filter(place => category === "all" || place.category === category);
  return <VirtualizedScreen
    key={`explore-${fontScale}`}
    navigationLabelMaxFontSizeMultiplier={1.4}
    brandVariant="city-hub"
    data={view === "list" ? visiblePlaces : []}
    keyExtractor={place => place.slug}
    contentContainerStyle={styles.content}
    ListHeaderComponent={<View style={styles.header}>
      <View style={styles.intro}>
        <AppText accessibilityRole="header" style={[styles.title, fontScale > 1.5 && { fontSize: 24, lineHeight: 30 }, fontScale > 2.5 && { fontSize: 15, lineHeight: 21 }]}>{t.explore}{" "}{nativeCityName(city.slug, city.content.name, locale)}</AppText>
        <Link href={{ pathname: "/city/[citySlug]/search", params: { citySlug: city.slug } }} asChild>
          <PressableSurface accessibilityLabel={searchLabels.placeholder} accessibilityRole="link" style={StyleSheet.flatten([styles.search, nativeRowStyle(direction)])}>
            <NativeIcon ios="magnifyingglass" android="search" color={colors.textMuted} size={19} />
            <AppText numberOfLines={expanded ? undefined : 1} style={styles.searchLabel}>{searchLabels.placeholder}</AppText>
          </PressableSurface>
        </Link>
        <WalkChoices label={messages.places} showHeading={false} compact cityHub variant="chips"
          options={(["all", "see", "eat", "fun"] as const).map(value => ({ value, label: labels[value] }))}
          selected={[category]} onSelect={setCategory} />
      </View>
      <View style={[styles.resultControls, nativeRowStyle(direction), expanded && styles.stacked]}>
        <AppText accessibilityLiveRegion="polite" variant="label" style={styles.muted}>{messages.places} · {visiblePlaces.length}</AppText>
        <View style={styles.viewSwitch}><WalkChoices label={messages.map} showHeading={false} compact cityHub variant="segment"
          options={[{ value: "list" as const, label: labels.list }, { value: "map" as const, label: labels.map }]}
          selected={[view]} onSelect={setView} /></View>
      </View>
      {saveError ? <View style={styles.header}><StatusMessage tone="error">{messages.tripSaveFailed}</StatusMessage>{!saveReady ? <PrimaryButton tone="secondary" label={messages.retry} onPress={reloadSaved} /> : null}</View> : null}
      {view === "map" ? <NativeCityMap citySlug={city.slug} places={visiblePlaces} /> : null}
    </View>}
    ListEmptyComponent={view === "list" ? <EmptyState title={messages.places} description={t.noEligible} icon={<NativeIcon ios="magnifyingglass" android="search" />} /> : null}
    renderItem={({ item: place }) => <ExplorePlaceRow citySlug={city.slug} locale={locale} place={place} visitMinutes={messages.visitMinutes}
      saved={saved.has(place.slug)} saveDisabled={!saveReady || busy.has(place.slug)} onSave={() => void save(place)} />}
  />;
}

function ExplorePlaceRow({
  citySlug,
  locale,
  place,
  visitMinutes,
  saved, saveDisabled, onSave,
}: Readonly<{
  citySlug: string;
  locale: Parameters<typeof prefetchPublicPlace>[2];
  place: PublicPlaceCard;
  visitMinutes: string;
  saved: boolean; saveDisabled: boolean; onSave(): void;
}>) {
  const { direction } = useNativeLocale();
  const labels = discoveryCopy(locale);
  const photo = explorePhotography(citySlug, place);
  const { expanded } = useResponsiveTextLayout();
  const [feedback, setFeedback] = useState("");
  const [customize, setCustomize] = useState(false);
  const name = nativePlaceName(citySlug, place.slug, place.content.name, locale);
  const textStyle = nativeContentTextStyle(locale, place.resolvedLocale);

  return (
    <View style={styles.placeShell}>
        <Link
          href={{
            pathname: "/city/[citySlug]/place/[placeSlug]",
            params: { citySlug, placeSlug: place.slug },
          }}
          asChild
        >
          <PressableSurface
            accessibilityRole="link"
            style={StyleSheet.flatten([
              styles.placeLink,
              nativeRowStyle(direction),
              expanded && styles.stacked,
            ])}
            onPress={() => {
              void triggerCitywalkHaptic("light");
            }}
            onPressIn={() => {
              void prefetchPublicPlace(citySlug, place.slug, locale).catch(
                () => undefined,
              );
            }}
          >
            {photo ? <Image
              source={photo?.uri ? { uri: citywalkApi.resolveUrl(photo.uri) } : photo?.source}
              placeholderIcon={
                place.category === "eat"
                  ? { ios: "fork.knife", android: "restaurant" }
                  : place.category === "fun"
                    ? { ios: "sparkles", android: "auto_awesome" }
                    : { ios: "mappin", android: "place" }
              }
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={`${citySlug}:${place.slug}:explore`}
              transition={motion.press}
              style={[styles.thumbnail, expanded && styles.expandedThumbnail]}
              accessibilityLabel={nativePlaceName(
                citySlug,
                place.slug,
                place.content.name,
                locale,
              )}
            /> : <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.thumbnail, styles.placeholder, expanded && styles.expandedThumbnail]}>
              <View style={styles.placeholderOrbit} />
              <View style={styles.placeholderMedallion}>
                <NativeIcon ios={place.category === "eat" ? "fork.knife" : place.category === "fun" ? "sparkles" : "map"}
                  android={place.category === "eat" ? "restaurant" : place.category === "fun" ? "auto_awesome" : "map"} size={30} color={colors.primary} />
              </View>
            </View>}
            <View style={[styles.placeCopy, nativeTextBlock(direction)]}>
              <AppText numberOfLines={expanded ? undefined : 2} style={styles.placeTitle}>
                {nativePlaceName(
                  citySlug,
                  place.slug,
                  place.content.name,
                  locale,
                )}
              </AppText>
              <AppText variant="caption" style={styles.metadata}>
                {labels[place.category]} · {place.durationMinutes} {visitMinutes}
              </AppText>
              {place.content.shortDescription ? (
                <AppText
                  numberOfLines={expanded ? undefined : 3}
                  variant="metadata"
                  style={[styles.description, textStyle]}
                >
                  {place.content.shortDescription}
                </AppText>
              ) : null}
            </View>
          </PressableSurface>
        </Link>
        <View style={[styles.membership, nativeRowStyle(direction), expanded && styles.expandedActions]}>
          <PressableSurface accessibilityRole="button" accessibilityLabel={`${translate(locale, saved ? "common.saved" : "common.save")}: ${name}`}
            accessibilityState={{ selected: saved, disabled: saveDisabled }} disabled={saveDisabled} onPress={onSave} style={styles.save}>
            <NativeIcon ios={saved ? "heart.fill" : "heart"} android={saved ? "favorite" : "favorite_border"} color={colors.primary} size={19} />
            <AppText style={styles.saveLabel}>{translate(locale, saved ? "common.saved" : "common.save")}</AppText>
          </PressableSurface>
          <WalkMembershipControl citySlug={citySlug} placeSlug={place.slug} dense inline discoveryCard onFeedback={(message, showCustomize) => { setFeedback(message); setCustomize(showCustomize); }} />
        </View>
      {photo?.credit || photo?.attribution ? <MediaAttribution attribution={photo.credit ? {
        text: `${photo.credit.credit} · Wikimedia Commons ${photo.credit.source} · ${photo.credit.licenseName} ${photo.credit.license}`,
      } : photo.attribution} /> : null}
      {feedback ? <AppText accessibilityLiveRegion="polite" style={styles.feedback}>{feedback}</AppText> : null}
      {customize ? <Link href={{ pathname: "/city/[citySlug]/walk", params: { citySlug } }} asChild><PrimaryButton label={walkCopy(locale).customize} tone="secondary" /></Link> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 4, gap: 16 },
  header: { gap: 10 },
  intro: { padding: 14, gap: 10, borderRadius: 22, backgroundColor: colors.text },
  title: { color: colors.surface, fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", fontSize: 28, lineHeight: 34, fontWeight: "700", letterSpacing: -0.5 },
  muted: { color: colors.textMuted },
  search: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, padding: 10, backgroundColor: colors.surface, borderRadius: 12 },
  searchLabel: { flex: 1, color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  resultControls: { alignItems: "center", justifyContent: "space-between", gap: 8 },
  viewSwitch: { minWidth: 176 },
  stacked: { flexDirection: "column", alignItems: "stretch" },
  placeShell: { ...shadows.card, backgroundColor: colors.surface, borderRadius: 22, padding: 12, gap: 10 },
  placeLink: { minWidth: 0, minHeight: 128, flexDirection: "row", alignItems: "center", gap: 14 },
  thumbnail: { width: 100, height: 132, flexShrink: 0, borderRadius: 15, backgroundColor: colors.primarySoft, overflow: "hidden" },
  expandedThumbnail: { width: "100%", height: 150 },
  placeholder: { alignItems: "center", justifyContent: "center", backgroundColor: "#EAF3F7" },
  placeholderOrbit: { position: "absolute", width: 170, height: 100, borderWidth: 1, borderColor: "#D0E3EB", borderRadius: 60, transform: [{ rotate: "-40deg" }] },
  placeholderMedallion: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#FBFDFF", alignItems: "center", justifyContent: "center" },
  placeCopy: { flex: 1, minWidth: 0, gap: 6 },
  placeTitle: { color: colors.text, fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", fontSize: 21, lineHeight: 26, fontWeight: "700", letterSpacing: -0.3 },
  metadata: { color: colors.primary, fontSize: 11, lineHeight: 16, fontWeight: "600" },
  description: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  membership: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" },
  expandedActions: { flexDirection: "column", alignItems: "flex-end" },
  save: { minWidth: 78, minHeight: 44, paddingHorizontal: 8, flexDirection: "row", gap: 6, justifyContent: "center", alignItems: "center" },
  saveLabel: { color: colors.primary, fontSize: 13, lineHeight: 19, fontWeight: "600", flexShrink: 1 },
  feedback: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
});
