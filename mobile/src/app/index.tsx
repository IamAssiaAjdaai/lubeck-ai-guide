import { Image } from "expo-image";
import { Link } from "expo-router";
import { useRef } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import citywalkHero from "../../assets/images/citywalk-hero.png";
import { CitywalkLoading } from "../components/CitywalkLoading";
import { LocaleSelector } from "../components/LocaleSelector";
import { MediaAttribution } from "../components/MediaAttribution";
import { AppText, Card, PrimaryButton, Screen, SectionTitle, StatusMessage } from "../components/ui";
import { colors, radius, spacing } from "../design/tokens";
import { usePublicCities } from "../hooks/usePublicContent";
import { citywalkApi } from "../lib/api/instance";
import { selectPrimaryImageMedia } from "../lib/api/media";
import { getNativeDirection, getNativeTextAlignment } from "../lib/localization";
import { useNativeLocale } from "../localization/LocaleProvider";

export default function HomeScreen() {
  const { locale, messages } = useNativeLocale();
  const cities = usePublicCities(locale);
  const scrollViewRef = useRef<ScrollView>(null);
  const availableCitiesY = useRef(0);

  return (
    <Screen includeTopSafeArea scrollViewRef={scrollViewRef}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <AppText variant="label" style={styles.brand}>CITYWALK</AppText>
          <Link href="/account" asChild>
            <Pressable accessibilityRole="button" hitSlop={8}>
              <AppText variant="label" style={styles.account}>{messages.account}</AppText>
            </Pressable>
          </Link>
        </View>
        <LocaleSelector />
      </View>

      <View style={styles.hero}>
        <Image
          accessibilityLabel={messages.homeHeroTitle}
          contentFit="cover"
          source={citywalkHero}
          style={styles.heroImage}
        />
        <AppText variant="hero" style={styles.heroTitle}>{messages.homeHeroTitle}</AppText>
        <AppText style={styles.heroCopy}>{messages.homeHeroSubtitle}</AppText>
        <PrimaryButton
          label={messages.discoverCity}
          onPress={() => scrollViewRef.current?.scrollTo({ y: availableCitiesY.current, animated: true })}
          style={styles.discoverButton}
        />
        <View style={styles.reassurance}>
          <AppText accessibilityElementsHidden style={styles.check}>✓</AppText>
          <AppText variant="caption" style={styles.reassuranceText}>{messages.noSignUpRequired}</AppText>
        </View>
      </View>

      <View onLayout={({ nativeEvent }) => { availableCitiesY.current = nativeEvent.layout.y; }}>
        <SectionTitle>{messages.availableCities}</SectionTitle>
      </View>
      {cities.status === "loading" ? <CitywalkLoading compact /> : null}
      {cities.status === "error" ? <StatusMessage>{messages.unavailable}</StatusMessage> : null}
      {cities.status === "available" ? cities.data.cities.map((city) => {
        const image = selectPrimaryImageMedia(city.media);
        const contentDirection = getNativeDirection(city.resolvedLocale);
        const contentTextStyle = {
          writingDirection: contentDirection,
          textAlign: getNativeTextAlignment(city.resolvedLocale),
        } as const;
        return (
          <Card key={city.slug}>
            {image ? (
              <View>
                <Image
                  source={{ uri: citywalkApi.resolveUrl(image.url) }}
                  contentFit="cover"
                  style={styles.cityImage}
                  accessibilityLabel={city.name}
                />
                <MediaAttribution attribution={image.attribution} />
              </View>
            ) : <View style={styles.imageFallback} />}
            <View style={{ direction: contentDirection }}>
              <AppText variant="title" style={contentTextStyle}>{city.name}</AppText>
              {city.shortDescription ? (
                <AppText style={contentTextStyle}>{city.shortDescription}</AppText>
              ) : null}
            </View>
            <Link href={{ pathname: "/city/[citySlug]", params: { citySlug: city.slug } }} asChild>
              <PrimaryButton label={`${messages.exploreCity} — ${city.name}`} />
            </Link>
          </Card>
        );
      }) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.md },
  brandRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { color: colors.primary, letterSpacing: 2 },
  account: { color: colors.textMuted },
  hero: { alignItems: "center", gap: spacing.md },
  heroImage: {
    aspectRatio: 5 / 4,
    backgroundColor: colors.surface,
    borderColor: "#DBEAFE",
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    width: "100%",
  },
  heroTitle: { textAlign: "center", maxWidth: 330 },
  heroCopy: { textAlign: "center", color: colors.textMuted, maxWidth: 320 },
  discoverButton: { alignSelf: "stretch" },
  reassurance: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  check: { color: colors.teal, fontWeight: "800" },
  reassuranceText: { color: colors.textMuted },
  cityImage: { width: "100%", height: 180, borderRadius: radius.md, backgroundColor: "#EEF2FF" },
  imageFallback: { width: "100%", height: 120, borderRadius: radius.md, backgroundColor: "#EEF2FF" },
});
