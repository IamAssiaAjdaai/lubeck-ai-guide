import { useState } from "react";
import { Link, useLocalSearchParams } from "expo-router";
import { StyleSheet, TextInput, View } from "react-native";

import { walkCopy } from "@citywalk/traveler-core/walkCopy";
import type { PublicPlaceCard } from "../../../lib/api/contracts";
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
  Screen,
  StatusMessage,
} from "../../../components/ui";
import { discoveryCopy } from "../../../design/discoveryCopy";
import {
  nativeContentTextStyle,
  nativeRowStyle,
  nativeTextBlock,
  nativeTextStyle,
} from "../../../design/rtlPresentation";
import { colors, motion, radius, spacing } from "../../../design/tokens";
import { prefetchPublicPlace, usePublicCity } from "../../../hooks/usePublicContent";
import { citywalkApi } from "../../../lib/api/instance";
import { selectImageUrl, selectPrimaryImageMedia } from "../../../lib/api/media";
import { nativeCityName, nativePlaceName } from "../../../lib/displayNames";
import { triggerCitywalkHaptic } from "../../../lib/haptics";
import { parseCityRouteIdentity } from "../../../lib/routing";
import { useNativeLocale } from "../../../localization/LocaleProvider";

export default function ExploreScreen() {
  const params = useLocalSearchParams<{ citySlug?: string | string[] }>();
  const identity = parseCityRouteIdentity(params.citySlug);
  const { direction, locale, messages } = useNativeLocale();
  const t = walkCopy(locale);
  const labels = discoveryCopy(locale);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | "see" | "eat" | "fun">("all");
  const [view, setView] = useState<"list" | "map">("list");
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

  const { city, places } = cityState.data;
  const normalizedQuery = query.trim().toLocaleLowerCase(locale);
  const visiblePlaces = places.filter((place) => {
    if (category !== "all" && place.category !== category) return false;
    if (!normalizedQuery) return true;
    const haystack = [
      nativePlaceName(city.slug, place.slug, place.content.name, locale),
      place.content.shortDescription ?? "",
      labels[place.category],
    ]
      .join(" ")
      .toLocaleLowerCase(locale);
    return haystack.includes(normalizedQuery);
  });

  return (
    <Screen brand={false} scrollDiagnostics="explore">
      <View style={styles.heading}>
        <AppText accessibilityRole="header" variant="heading">
          {t.explore}
        </AppText>
        <AppText variant="metadata" style={styles.muted}>
          {nativeCityName(city.slug, city.content.name, locale)}
        </AppText>
      </View>

      <View style={[styles.search, nativeRowStyle(direction)]}>
        <NativeIcon
          ios="magnifyingglass"
          android="search"
          color={colors.textMuted}
          size={19}
        />
        <TextInput
          accessibilityLabel={`${t.explore}: ${messages.places}`}
          placeholder={`${messages.places}…`}
          placeholderTextColor={colors.textSubtle}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
          style={[styles.searchInput, nativeTextStyle(direction)]}
        />
      </View>

      <WalkChoices
        label=""
        showHeading={false}
        compact
        variant="chips"
        options={(["all", "see", "eat", "fun"] as const).map((value) => ({
          value,
          label: labels[value],
        }))}
        selected={[category]}
        onSelect={setCategory}
      />

      <View style={styles.viewSwitch}>
        <WalkChoices
          label=""
          showHeading={false}
          compact
          variant="segment"
          options={[
            { value: "list" as const, label: labels.list },
            { value: "map" as const, label: labels.map },
          ]}
          selected={[view]}
          onSelect={setView}
        />
      </View>

      {view === "map" ? (
        <NativeCityMap citySlug={city.slug} places={visiblePlaces} />
      ) : visiblePlaces.length ? (
        <View style={styles.results}>
          {visiblePlaces.map((place) => (
            <ExplorePlaceRow
              key={place.slug}
              citySlug={city.slug}
              locale={locale}
              place={place}
              visitMinutes={messages.visitMinutes}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          title={messages.places}
          description={t.noEligible}
          icon={<NativeIcon ios="magnifyingglass" android="search" />}
        />
      )}
    </Screen>
  );
}

function ExplorePlaceRow({
  citySlug,
  locale,
  place,
  visitMinutes,
}: Readonly<{
  citySlug: string;
  locale: Parameters<typeof prefetchPublicPlace>[2];
  place: PublicPlaceCard;
  visitMinutes: string;
}>) {
  const { direction } = useNativeLocale();
  const labels = discoveryCopy(locale);
  const imageMedia = selectPrimaryImageMedia(place.media);
  const image = selectImageUrl(
    imageMedia,
    place.image,
    place.imageVariants,
    "card",
  );
  const textStyle = nativeContentTextStyle(locale, place.resolvedLocale);

  return (
    <View style={styles.placeShell}>
      <View style={[styles.placeRow, nativeRowStyle(direction)]}>
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
            <Image
              source={image ? { uri: citywalkApi.resolveUrl(image) } : undefined}
              fallbackSource={
                place.image
                  ? { uri: citywalkApi.resolveUrl(place.image) }
                  : undefined
              }
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
              style={styles.thumbnail}
              accessibilityLabel={nativePlaceName(
                citySlug,
                place.slug,
                place.content.name,
                locale,
              )}
            />
            <View style={[styles.placeCopy, nativeTextBlock(direction)]}>
              <AppText numberOfLines={1} variant="cardTitle">
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
                  numberOfLines={2}
                  variant="metadata"
                  style={[styles.description, textStyle]}
                >
                  {place.content.shortDescription}
                </AppText>
              ) : null}
            </View>
          </PressableSurface>
        </Link>
        <View style={styles.membership}>
          <WalkMembershipControl
            citySlug={citySlug}
            placeSlug={place.slug}
            dense
            inline
          />
        </View>
      </View>
      {imageMedia?.attribution ? (
        <View style={styles.attribution}>
          <MediaAttribution attribution={imageMedia.attribution} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 2 },
  muted: { color: colors.textMuted },
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
  viewSwitch: { alignSelf: "flex-start", minWidth: 190 },
  results: { gap: 0 },
  placeShell: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
  },
  placeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  placeLink: {
    flex: 1,
    minWidth: 0,
    minHeight: 88,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  thumbnail: {
    width: 82,
    height: 82,
    flexShrink: 0,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
  },
  placeCopy: { flex: 1, minWidth: 0, gap: 3 },
  metadata: { color: colors.textMuted },
  description: { color: colors.textMuted },
  membership: { flexShrink: 0, maxWidth: 104 },
  attribution: { paddingTop: spacing.xs, paddingStart: 94 },
});
