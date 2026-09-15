import { Image } from "expo-image";
import { Link } from "expo-router";
import { useRef } from "react";
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
  const { direction, locale, messages } = useNativeLocale();
  const cities = usePublicCities(locale);
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
      {cities.status === "available" ? cities.data.cities.map((city) => {
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
                  <View style={styles.cityText}>
                    <AppText variant="title" style={contentTextStyle}>{city.name}</AppText>
                    {city.shortDescription ? (
                      <AppText numberOfLines={3} style={[contentTextStyle, styles.cityDescription]}>{city.shortDescription}</AppText>
                    ) : null}
                  </View>
                  <View accessibilityElementsHidden style={styles.cityAffordance}>
                    <NativeIcon ios={direction === "rtl" ? "arrow.up.left" : "arrow.up.right"} android={direction === "rtl" ? "arrow_back" : "arrow_forward"} color={colors.primary} size={20} />
                  </View>
                </View>
              </PressableSurface>
            </Link>
            <View style={styles.attribution}><MediaAttribution attribution={image?.attribution} /></View>
          </MotionView>
        );
      }) : null}
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
    elevation: 2,
    overflow: "hidden",
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
  },
  cityLink: { borderRadius: radius.lg, overflow: "hidden" },
  cityImage: { width: "100%", height: 205, backgroundColor: colors.primarySoft },
  imageFallback: { width: "100%", height: 160, backgroundColor: colors.primarySoft },
  cityContent: { alignItems: "center", flexDirection: "row", gap: spacing.md, padding: spacing.md },
  cityText: { flex: 1, gap: spacing.xs },
  cityDescription: { color: colors.textMuted },
  cityAffordance: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  attribution: { paddingBottom: spacing.sm, paddingHorizontal: spacing.md },
});
