import { cityLaunches } from "@citywalk/traveler-core/cityAvailability";
import { calculateDistanceMeters } from "@citywalk/traveler-core";
import { walkCopy } from "@citywalk/traveler-core/walkCopy";
import { WalkInput } from "../components/WalkControls";
import { requestForegroundLocation } from "../lib/location";
import { expoForegroundLocationAdapter } from "../lib/location.expo";
import { NativeContentImage as Image } from "../components/NativeContentImage";
import { Link } from "expo-router";
import { useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import citywalkHero from "../../assets/images/citywalk-hero.png";
import { CitywalkLoading } from "../components/CitywalkLoading";
import { MediaAttribution } from "../components/MediaAttribution";
import { NativeHeaderActions } from "../components/NativeHeaderActions";
import { NativeIcon } from "../components/NativeIcon";
import { AppText, EmptyState, MotionView, PressableSurface, PrimaryButton, Screen, SectionTitle } from "../components/ui";
import { colors, motion, radius, spacing } from "../design/tokens";
import { prefetchPublicCity, usePublicCities } from "../hooks/usePublicContent";
import { citywalkApi } from "../lib/api/instance";
import { selectImageUrl, selectPrimaryImageMedia } from "../lib/api/media";
import { triggerCitywalkHaptic } from "../lib/haptics";
import { getNativeDirection, getNativeTextAlignment } from "../lib/localization";
import { useNativeLocale } from "../localization/LocaleProvider";

export default function HomeScreen() {
  const { locale, messages } = useNativeLocale();
  const cities = usePublicCities(locale);
  const t = walkCopy(locale);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number }>();
  const [locating, setLocating] = useState(false), [locationHelp, setLocationHelp] = useState("");
  async function locate() {
    setLocating(true);
    const result = await requestForegroundLocation(expoForegroundLocationAdapter);
    setLocating(false);
    if (result.status === "available") { setLocation({ lat: result.location.latitude, lng: result.location.longitude }); setLocationHelp(t.nearest); }
    else setLocationHelp(t.locationHelp);
  }
  const filteredCities = cities.status === "available" ? cities.data.cities.filter(city => (cityLaunches[city.slug]?.status ?? "available") === "available" && city.name.toLocaleLowerCase(locale).includes(query.toLocaleLowerCase(locale))).sort((a, b) => {
    if (!location) return 0;
    const first = cityLaunches[a.slug]?.coordinates, second = cityLaunches[b.slug]?.coordinates;
    return (first ? calculateDistanceMeters(location, first) ?? Infinity : Infinity) - (second ? calculateDistanceMeters(location, second) ?? Infinity : Infinity);
  }) : [];
  const coming = Object.entries(cityLaunches).filter(([,city]) => city.status === "coming_soon" && city.name.toLocaleLowerCase(locale).includes(query.toLocaleLowerCase(locale)));
  const scrollViewRef = useRef<ScrollView>(null);
  const availableCitiesY = useRef(0);

  return (
    <Screen includeTopSafeArea scrollViewRef={scrollViewRef}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <AppText variant="label" style={styles.brand}>CITYWALK</AppText>
          <NativeHeaderActions />
        </View>
      </View>

      <View style={styles.hero}>
        <Image
          accessibilityLabel={messages.homeHeroTitle}
          contentFit="cover"
          source={citywalkHero}
          style={styles.heroImage}
          transition={motion.component}
        />
        <View style={styles.heroCopyBlock}>
          <AppText variant="hero" style={styles.heroTitle}>{messages.homeHeroTitle}</AppText>
          <AppText style={styles.heroCopy}>{messages.homeHeroSubtitle}</AppText>
        </View>
        <PrimaryButton
          label={messages.discoverCity}
          onPress={() => scrollViewRef.current?.scrollTo({ y: availableCitiesY.current, animated: true })}
          style={styles.discoverButton}
          trailingIcon={<NativeIcon ios="arrow.down" android="arrow_downward" color="#FFFFFF" size={18} />}
        />
        <View style={styles.reassurance}>
          <NativeIcon ios="checkmark.circle.fill" android="check_circle" color={colors.success} size={17} />
          <AppText variant="caption" style={styles.reassuranceText}>{messages.noSignUpRequired}</AppText>
        </View>
      </View>

      <PrimaryButton label={t.location} busy={locating} onPress={() => void locate()} />
      {locationHelp ? <AppText>{locationHelp}</AppText> : null}
      <WalkInput label={t.search} value={query} onChangeText={setQuery} placeholder={t.search} />
      <View onLayout={({ nativeEvent }) => { availableCitiesY.current = nativeEvent.layout.y; }}>
        <SectionTitle>{messages.availableCities}</SectionTitle>
      </View>
      {cities.status === "loading" ? <CitywalkLoading variant="home" /> : null}
      {cities.status === "error" ? (
        <EmptyState
          description={messages.unavailable}
          icon={<NativeIcon ios="wifi.slash" android="wifi_off" color={colors.primary} size={28} />}
          title={messages.availableCities}
        />
      ) : null}
      {cities.status === "available" && cities.data.cities.length === 0 ? (
        <EmptyState
          description={messages.unavailable}
          icon={<NativeIcon ios="map" android="map" color={colors.primary} size={28} />}
          title={messages.availableCities}
        />
      ) : null}
      {cities.status === "available" ? filteredCities.map((city) => {
        const image = selectPrimaryImageMedia(city.media);
        const imageUrl = selectImageUrl(image, undefined, undefined, "card");
        const contentDirection = getNativeDirection(city.resolvedLocale);
        const contentTextStyle = {
          writingDirection: contentDirection,
          textAlign: getNativeTextAlignment(city.resolvedLocale),
        } as const;
        return (
          <MotionView key={city.slug} style={styles.cityCard}>
            <Link href={{ pathname: "/city/[citySlug]", params: { citySlug: city.slug } }} asChild>
              <PressableSurface
                accessibilityLabel={`${messages.exploreCity}: ${city.name}`}
                accessibilityRole="link"
                onPressIn={() => {
                  void prefetchPublicCity(city.slug, locale).catch(() => undefined);
                }}
                onPress={() => { void triggerCitywalkHaptic("medium"); }}
                style={styles.cityLink}
              >
                {image && imageUrl ? (
                  <Image
                    source={{ uri: citywalkApi.resolveUrl(imageUrl) }}
                    cachePolicy="memory-disk"
                    contentFit="cover"
                    style={styles.cityImage}
                    accessibilityLabel={city.name}
                    transition={motion.component}
                  />
                ) : <View style={styles.imageFallback} />}
                <View style={[styles.cityContent, { direction: contentDirection }]}>
                  <AppText variant="title" style={contentTextStyle}>{city.name}</AppText>
                  <AppText>{t.availableNow}</AppText>
                  {city.shortDescription ? (
                    <AppText numberOfLines={2} style={[contentTextStyle, styles.cityDescription]}>{city.shortDescription}</AppText>
                  ) : null}
                </View>
              </PressableSurface>
            </Link>
            <View style={styles.attribution}><MediaAttribution attribution={image?.attribution} /></View>
          </MotionView>
        );
      }) : null}
      {coming.map(([slug, city]) => <View key={slug} style={styles.cityContent}><AppText variant="title">{city.name}</AppText><AppText>{t.comingSoon}</AppText></View>)}
      {cities.status === "available" && !filteredCities.length && !coming.length ? <AppText>{t.noCities}</AppText> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.md },
  brandRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { color: colors.primary, letterSpacing: 2 },
  hero: { alignItems: "center", gap: spacing.md, paddingBottom: spacing.sm },
  heroImage: {
    aspectRatio: 5 / 4,
    backgroundColor: colors.surface,
    borderColor: "#DBEAFE",
    borderRadius: radius.hero,
    borderWidth: StyleSheet.hairlineWidth,
    width: "100%",
  },
  heroCopyBlock: { alignItems: "center", gap: spacing.sm },
  heroTitle: { textAlign: "center", maxWidth: 330 },
  heroCopy: { textAlign: "center", color: colors.textMuted, maxWidth: 320 },
  discoverButton: { alignSelf: "stretch" },
  reassurance: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  reassuranceText: { color: colors.textMuted },
  cityCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 3,
    overflow: "hidden",
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
  },
  cityLink: { borderRadius: radius.lg, overflow: "hidden" },
  cityImage: { width: "100%", height: 176, backgroundColor: colors.primarySoft },
  imageFallback: { width: "100%", height: 150, backgroundColor: colors.primarySoft },
  cityContent: { gap: spacing.xs, paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xs },
  cityDescription: { color: colors.textMuted, lineHeight: 21 },
  attribution: { paddingBottom: spacing.sm, paddingHorizontal: spacing.md },
});
