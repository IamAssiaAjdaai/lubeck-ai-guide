import { triggerCitywalkHaptic } from "../lib/haptics";
import { cityLaunches } from "@citywalk/traveler-core/cityAvailability";
import { calculateDistanceMeters } from "@citywalk/traveler-core";
import { walkCopy } from "@citywalk/traveler-core/walkCopy";
import { Link, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { V2Hero } from "../components/V2Presentation";
import { NativeContentImage } from "../components/NativeContentImage";
import { CitywalkLoading } from "../components/CitywalkLoading";
import { MediaAttribution } from "../components/MediaAttribution";
import { NativeIcon } from "../components/NativeIcon";
import {
  AppText,
  EmptyState,
  PressableSurface,
  PrimaryButton,
  Screen,
  SectionTitle,
} from "../components/ui";
import { colors, motion, radius, shadows, spacing } from "../design/tokens";
import { prefetchPublicCity, usePublicCities } from "../hooks/usePublicContent";
import { citywalkApi } from "../lib/api/instance";
import { selectImageUrl, selectPrimaryImageMedia } from "../lib/api/media";
import {
  getNativeDirection,
} from "../lib/localization";
import { requestForegroundLocation } from "../lib/location";
import { expoForegroundLocationAdapter } from "../lib/location.expo";
import { useNativeLocale } from "../localization/LocaleProvider";

export default function HomeScreen() {
  const { locale, direction, messages } = useNativeLocale(),
    t = walkCopy(locale);
  const cities = usePublicCities(locale);
  const { section } = useLocalSearchParams<{ section?: string }>();
  const scroll = useRef<ScrollView>(null);
  const [citiesOffset, setCitiesOffset] = useState(0);
  useEffect(() => {
    if (section === "cities")
      scroll.current?.scrollTo({ y: citiesOffset, animated: true });
  }, [section, citiesOffset]);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number }>();
  const [locating, setLocating] = useState(false),
    [locationHelp, setLocationHelp] = useState("");
  async function locate() {
    setLocating(true);
    const result = await requestForegroundLocation(
      expoForegroundLocationAdapter,
    );
    setLocating(false);
    if (result.status === "available") {
      setLocation({
        lat: result.location.latitude,
        lng: result.location.longitude,
      });
      setLocationHelp(t.nearest);
    } else setLocationHelp(t.locationHelp);
  }
  const available =
    cities.status === "available"
      ? cities.data.cities
          .filter(
            (city) =>
              (cityLaunches[city.slug]?.status ?? "available") === "available",
          )
          .map((city) => ({
            ...city,
            available: true,
            image: selectImageUrl(
              selectPrimaryImageMedia(city.media),
              cityLaunches[city.slug]?.heroImage,
              undefined,
              "card",
            ),
            attribution: selectPrimaryImageMedia(city.media)?.attribution,
          }))
      : [];
  const upcoming = Object.entries(cityLaunches)
    .filter(([, c]) => c.status === "coming_soon")
    .map(([slug, c]) => ({
      slug,
      name: c.name,
      available: false,
      image: c.heroImage,
      resolvedLocale: "de",
      shortDescription:
        slug === "hamburg"
          ? t.hamburgDescription
          : slug === "duesseldorf"
            ? t.duesseldorfDescription
            : undefined,
      attribution: c.credit ? { text: c.credit.text } : undefined,
    }));
  const choices = [...available, ...upcoming]
    .filter((c) =>
      c.name
        .toLocaleLowerCase(locale)
        .includes(query.toLocaleLowerCase(locale)),
    )
    .sort((a, b) => {
      if (a.available !== b.available) return a.available ? -1 : 1;
      if (!location) return 0;
      return (
        (calculateDistanceMeters(location, cityLaunches[a.slug]?.coordinates) ??
          Infinity) -
        (calculateDistanceMeters(location, cityLaunches[b.slug]?.coordinates) ??
          Infinity)
      );
    });
  return (
    <Screen scrollViewRef={scroll}>
      <V2Hero title={t.homeTitle} subtitle={t.homeSubtitle} />
      <PrimaryButton
        label={t.location}
        busy={locating}
        onPress={() => void locate()}
        leadingIcon={
          <NativeIcon
            ios="location.fill"
            android="near_me"
            color={colors.surface}
            size={20}
          />
        }
      />
      {locationHelp ? (
        <AppText accessibilityLiveRegion="polite">{locationHelp}</AppText>
      ) : null}
      <View style={[styles.search, { direction }]}>
        <NativeIcon
          ios="magnifyingglass"
          android="search"
          color={colors.textMuted}
        />
        <TextInput
          accessibilityLabel={t.search}
          placeholder={t.search}
          placeholderTextColor={colors.textSubtle}
          value={query}
          onChangeText={setQuery}
          style={[
            styles.searchInput,
            { textAlign: direction === "rtl" ? "right" : "left" },
          ]}
        />
      </View>
      <View onLayout={(event) => setCitiesOffset(event.nativeEvent.layout.y)}>
        <SectionTitle>{t.available}</SectionTitle>
      </View>
      {cities.status === "loading" ? <CitywalkLoading variant="home" /> : null}
      {cities.status === "error" ? (
        <EmptyState
          title={t.available}
          description={messages.unavailable}
          icon={<NativeIcon ios="wifi.slash" android="wifi_off" />}
        />
      ) : null}
      {cities.status === "available" && !choices.length ? (
        <EmptyState
          title={t.noCities}
          description={t.search}
          icon={<NativeIcon ios="magnifyingglass" android="search" />}
        />
      ) : null}
      {choices.map((city) => {
        const body = (
          <View style={[styles.cityCard, { direction }]}>
            <NativeContentImage
              source={
                city.image
                  ? { uri: citywalkApi.resolveUrl(city.image) }
                  : undefined
              }
              fallbackSource={
                cityLaunches[city.slug]?.heroImage
                  ? {
                      uri: citywalkApi.resolveUrl(
                        cityLaunches[city.slug].heroImage!,
                      ),
                    }
                  : undefined
              }
              contentFit="cover"
              transition={motion.component}
              cachePolicy="memory-disk"
              style={styles.cityImage}
              accessibilityLabel={city.name}
            />
            <View style={styles.cityCopy}>
              <AppText
                variant="heading"
                style={{
                  writingDirection: getNativeDirection(city.resolvedLocale),
                  textAlign: direction === "rtl" ? "right" : "left",
                }}
              >
                {city.name}
              </AppText>
              <View style={styles.status}>
                {city.available ? (
                  <View style={styles.statusDot} />
                ) : (
                  <NativeIcon
                    ios="clock"
                    android="schedule"
                    size={14}
                    color={colors.textMuted}
                  />
                )}
                <AppText
                  variant="caption"
                  style={{
                    color: city.available ? colors.success : colors.textMuted,
                  }}
                >
                  {city.available ? t.availableNow : t.comingSoon}
                </AppText>
              </View>
              {city.shortDescription ? (
                <AppText
                  numberOfLines={2}
                  variant="metadata"
                  style={styles.muted}
                >
                  {city.shortDescription}
                </AppText>
              ) : null}
            </View>
            <NativeIcon
              ios={direction === "rtl" ? "chevron.left" : "chevron.right"}
              android={direction === "rtl" ? "chevron_left" : "chevron_right"}
              color={colors.textMuted}
              size={18}
            />
          </View>
        );
        return (
          <View key={city.slug}>
            {city.available ? (
              <Link
                href={{
                  pathname: "/city/[citySlug]",
                  params: { citySlug: city.slug },
                }}
                asChild
              >
                <PressableSurface
                  accessibilityRole="link"
                  accessibilityLabel={`${messages.exploreCity}: ${city.name}`}
                  onPress={() => {
                    void triggerCitywalkHaptic("medium");
                  }}
                  onPressIn={() => {
                    void prefetchPublicCity(city.slug, locale).catch(
                      () => undefined,
                    );
                  }}
                >
                  {body}
                </PressableSurface>
              </Link>
            ) : (
              body
            )}
            <MediaAttribution attribution={city.attribution} />
          </View>
        );
      })}
    </Screen>
  );
}
const styles = StyleSheet.create({
  search: {
    minHeight: 56,
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  searchInput: { flex: 1, minHeight: 56, color: colors.text, fontSize: 16 },
  cityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingEnd: spacing.sm,
    overflow: "hidden",
    ...shadows.card,
  },
  cityImage: {
    width: "43%",
    minHeight: 112,
    alignSelf: "stretch",
    borderRadius: radius.sm,
  },
  cityCopy: { flex: 1, minWidth: 0, gap: spacing.xs, paddingVertical: spacing.sm },
  status: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  muted: { color: colors.textMuted },
});
