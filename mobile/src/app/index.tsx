import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { LocaleSelector } from "../components/LocaleSelector";
import { AppText, Card, PrimaryButton, Screen, SectionTitle, StatusMessage } from "../components/ui";
import { colors, radius, spacing } from "../design/tokens";
import { usePublicCities } from "../hooks/usePublicContent";
import { citywalkApi } from "../lib/api/instance";
import { selectPrimaryImage } from "../lib/api/media";
import { getNativeDirection } from "../lib/localization";
import { useNativeLocale } from "../localization/LocaleProvider";

export default function HomeScreen() {
  const { locale, messages } = useNativeLocale();
  const cities = usePublicCities(locale);

  return (
    <Screen>
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
        <View style={styles.orbit} />
        <View style={styles.pin} />
        <AppText variant="hero" style={styles.heroTitle}>{messages.discoverCities}</AppText>
        <AppText style={styles.heroCopy}>{messages.appTagline}</AppText>
      </View>

      <SectionTitle>{messages.availableCities}</SectionTitle>
      {cities.status === "loading" ? <AppText>{messages.loading}</AppText> : null}
      {cities.status === "error" ? <StatusMessage>{messages.unavailable}</StatusMessage> : null}
      {cities.status === "available" ? cities.data.cities.map((city) => {
        const image = selectPrimaryImage(city.media);
        const contentDirection = getNativeDirection(city.resolvedLocale);
        return (
          <Card key={city.slug}>
            {image ? (
              <Image
                source={{ uri: citywalkApi.resolveUrl(image) }}
                contentFit="cover"
                style={styles.cityImage}
                accessibilityLabel={city.name}
              />
            ) : <View style={styles.imageFallback} />}
            <View style={{ direction: contentDirection }}>
              <AppText variant="title" style={{ writingDirection: contentDirection }}>{city.name}</AppText>
              {city.shortDescription ? (
                <AppText style={{ writingDirection: contentDirection }}>{city.shortDescription}</AppText>
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
  hero: { minHeight: 290, alignItems: "center", justifyContent: "center", gap: spacing.md, position: "relative" },
  heroTitle: { textAlign: "center", maxWidth: 330 },
  heroCopy: { textAlign: "center", color: colors.textMuted, maxWidth: 320 },
  orbit: { position: "absolute", width: 210, height: 118, borderWidth: 2, borderStyle: "dashed", borderColor: "#BFDBFE", borderRadius: radius.pill, transform: [{ rotate: "-14deg" }] },
  pin: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, borderWidth: 10, borderColor: "#DBEAFE" },
  cityImage: { width: "100%", height: 180, borderRadius: radius.md, backgroundColor: "#EEF2FF" },
  imageFallback: { width: "100%", height: 120, borderRadius: radius.md, backgroundColor: "#EEF2FF" },
});
