import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, TextInput, View } from "react-native";

import type { PublicPlaceCard } from "../../../lib/api/contracts";
import { ContentRecovery } from "../../../components/ContentRecovery";
import { CitywalkLoading } from "../../../components/CitywalkLoading";
import { NativeIcon } from "../../../components/NativeIcon";
import {
  AppText,
  EmptyState,
  PressableSurface,
  Screen,
  StatusMessage,
} from "../../../components/ui";
import { discoveryCopy } from "../../../design/discoveryCopy";
import { searchCopy } from "../../../design/searchCopy";
import {
  nativeRowStyle,
  nativeTextBlock,
  nativeTextStyle,
} from "../../../design/rtlPresentation";
import { colors, radius, spacing } from "../../../design/tokens";
import { prefetchPublicPlace, usePublicCity } from "../../../hooks/usePublicContent";
import { nativePlaceName } from "../../../lib/displayNames";
import {
  clearRecentSearches,
  loadRecentSearches,
  MAX_RECENT_SEARCHES,
  recordRecentSearch,
} from "../../../lib/searchHistory";
import { parseCityRouteIdentity } from "../../../lib/routing";
import { useNativeLocale } from "../../../localization/LocaleProvider";

export default function SearchScreen() {
  const params = useLocalSearchParams<{ citySlug?: string | string[] }>();
  const identity = parseCityRouteIdentity(params.citySlug);
  const citySlug = identity?.citySlug;
  const router = useRouter();
  const { direction, locale, messages } = useNativeLocale();
  const labels = discoveryCopy(locale);
  const copy = searchCopy(locale);
  const [query, setQuery] = useState("");
  const [recentSlugs, setRecentSlugs] = useState<readonly string[]>([]);
  const cityState = usePublicCity(citySlug ?? "invalid", locale);

  useFocusEffect(
    useCallback(() => {
      if (!citySlug) return;
      let alive = true;
      void loadRecentSearches(citySlug).then((items) => {
        if (alive) setRecentSlugs(items);
      });
      return () => {
        alive = false;
      };
    }, [citySlug]),
  );

  if (!identity) {
    return (
      <Screen navigation={false}>
        <StatusMessage>{messages.unavailable}</StatusMessage>
      </Screen>
    );
  }
  if (cityState.status === "loading") {
    return (
      <Screen navigation={false}>
        <CitywalkLoading variant="city" />
      </Screen>
    );
  }
  if (cityState.status === "error") {
    return (
      <Screen navigation={false}>
        <ContentRecovery retry={cityState.retry} citySlug={identity.citySlug} />
      </Screen>
    );
  }

  const { city, places } = cityState.data;
  const normalizedQuery = query.trim().toLocaleLowerCase(locale);
  const matches = places.filter((place) => {
    if (!normalizedQuery) return true;
    const haystack = [
      nativePlaceName(city.slug, place.slug, place.content.name, locale),
      place.content.shortDescription ?? "",
      labels[place.category],
      ...(place.content.facts?.flatMap((fact) => [fact.label ?? "", fact.value]) ?? []),
    ]
      .join(" ")
      .toLocaleLowerCase(locale);
    return haystack.includes(normalizedQuery);
  });
  const recentPlaces = recentSlugs
    .map((slug) => places.find((place) => place.slug === slug))
    .filter((place): place is PublicPlaceCard => Boolean(place));
  const visiblePlaces = normalizedQuery
    ? matches.slice(0, 12)
    : places
        .filter((place) => !recentSlugs.includes(place.slug))
        .slice(0, 6);

  const openPlace = (place: PublicPlaceCard) => {
    setRecentSlugs((current) =>
      [place.slug, ...current.filter((slug) => slug !== place.slug)].slice(
        0,
        MAX_RECENT_SEARCHES,
      ),
    );
    void recordRecentSearch(city.slug, place.slug);
    router.push({
      pathname: "/city/[citySlug]/place/[placeSlug]",
      params: { citySlug: city.slug, placeSlug: place.slug },
    });
  };

  return (
    <Screen navigation={false} scrollDiagnostics="search">
      <View style={[styles.search, nativeRowStyle(direction)]}>
        <NativeIcon
          ios="magnifyingglass"
          android="search"
          color={colors.textMuted}
          size={19}
        />
        <TextInput
          accessibilityLabel={copy.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          clearButtonMode="while-editing"
          placeholder={copy.placeholder}
          placeholderTextColor={colors.textSubtle}
          returnKeyType="search"
          value={query}
          onChangeText={setQuery}
          style={[styles.searchInput, nativeTextStyle(direction)]}
        />
      </View>

      {!normalizedQuery && recentPlaces.length ? (
        <View style={styles.section}>
          <View style={[styles.sectionHeader, nativeRowStyle(direction)]}>
            <AppText variant="label">{copy.recent}</AppText>
            <PressableSurface
              accessibilityRole="button"
              onPress={() => {
                setRecentSlugs([]);
                void clearRecentSearches(city.slug);
              }}
              style={styles.clearAction}
            >
              <AppText variant="metadata" style={styles.clearText}>
                {copy.clear}
              </AppText>
            </PressableSurface>
          </View>
          <View style={styles.rows}>
            {recentPlaces.map((place) => (
              <SearchPlaceRow
                key={`recent:${place.slug}`}
                citySlug={city.slug}
                locale={locale}
                place={place}
                visitMinutes={messages.visitMinutes}
                onPress={() => openPlace(place)}
              />
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <AppText variant="label">
          {normalizedQuery ? copy.results : copy.suggestions}
        </AppText>
        {visiblePlaces.length ? (
          <View style={styles.rows}>
            {visiblePlaces.map((place) => (
              <SearchPlaceRow
                key={`result:${place.slug}`}
                citySlug={city.slug}
                locale={locale}
                place={place}
                visitMinutes={messages.visitMinutes}
                onPress={() => openPlace(place)}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            title={copy.results}
            description={copy.noResults}
            icon={<NativeIcon ios="magnifyingglass" android="search" />}
          />
        )}
      </View>
    </Screen>
  );
}

function SearchPlaceRow({
  citySlug,
  locale,
  onPress,
  place,
  visitMinutes,
}: Readonly<{
  citySlug: string;
  locale: Parameters<typeof prefetchPublicPlace>[2];
  onPress: () => void;
  place: PublicPlaceCard;
  visitMinutes: string;
}>) {
  const { direction } = useNativeLocale();
  const labels = discoveryCopy(locale);
  const name = nativePlaceName(
    citySlug,
    place.slug,
    place.content.name,
    locale,
  );
  const icon =
    place.category === "eat"
      ? { ios: "fork.knife", android: "restaurant" }
      : place.category === "fun"
        ? { ios: "sparkles", android: "auto_awesome" }
        : { ios: "mappin", android: "place" };

  return (
    <PressableSurface
      accessibilityLabel={name}
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={() => {
        void prefetchPublicPlace(citySlug, place.slug, locale).catch(
          () => undefined,
        );
      }}
      style={[styles.resultRow, nativeRowStyle(direction)]}
    >
      <View style={styles.iconShell}>
        <NativeIcon
          ios={icon.ios}
          android={icon.android}
          color={colors.primary}
          size={19}
        />
      </View>
      <View style={[styles.resultCopy, nativeTextBlock(direction)]}>
        <AppText numberOfLines={1} variant="cardTitle">
          {name}
        </AppText>
        <AppText numberOfLines={1} variant="metadata" style={styles.muted}>
          {labels[place.category]} · {place.durationMinutes} {visitMinutes}
        </AppText>
      </View>
      <NativeIcon
        ios={direction === "rtl" ? "chevron.left" : "chevron.right"}
        android={direction === "rtl" ? "chevron_left" : "chevron_right"}
        color={colors.textSubtle}
        size={17}
      />
    </PressableSurface>
  );
}

const styles = StyleSheet.create({
  search: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    minHeight: 48,
    color: colors.text,
    fontSize: 16,
  },
  section: { gap: spacing.sm },
  sectionHeader: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  clearAction: {
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
  clearText: { color: colors.primary },
  rows: { gap: 0 },
  resultRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  iconShell: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
    flexShrink: 0,
  },
  resultCopy: { flex: 1, minWidth: 0, gap: 2 },
  muted: { color: colors.textMuted },
});
