import { cityLaunches } from "@citywalk/traveler-core/cityAvailability";
import { Stack } from "expo-router";
import { Linking, StyleSheet, View } from "react-native";

import { MediaAttribution } from "../components/MediaAttribution";
import { AppText, PressableSurface, Screen } from "../components/ui";
import { colors, spacing } from "../design/tokens";

const photoCopy: Record<string, { title: string; description: string }> = {
  en: { title: "Photo credits", description: "Image creators and license details for CITYWALK destination previews." },
  de: { title: "Bildnachweise", description: "Fotografen und Lizenzen der CITYWALK-Städtebilder." },
  fr: { title: "Crédits photo", description: "Auteurs et licences des photos de villes de CITYWALK." },
  es: { title: "Créditos de fotos", description: "Autores y licencias de las imágenes de CITYWALK." },
  nl: { title: "Fotocredits", description: "Makers en licenties van CITYWALK-stadsfoto’s." },
  da: { title: "Fotokreditering", description: "Fotografer og licenser for CITYWALKs bybilleder." },
  sv: { title: "Bildkreditering", description: "Fotografer och licenser för CITYWALKs stadsbilder." },
  ar: { title: "حقوق الصور", description: "أسماء المصورين وروابط التراخيص لصور المدن في CITYWALK." },
};

import { useNativeLocale } from "../localization/LocaleProvider";

export default function PhotoCreditsScreen() {
  const { locale } = useNativeLocale();
  const copy = photoCopy[locale] ?? photoCopy.en;
  const creditedCities = Object.entries(cityLaunches).filter(([, city]) => Boolean(city.credit));

  return (
    <Screen navigation={false}>
      <Stack.Screen options={{ title: copy.title }} />
      <View style={styles.header}>
        <AppText variant="screenTitle">{copy.title}</AppText>
        <AppText variant="metadata" style={styles.detail}>{copy.description}</AppText>
      </View>
      {creditedCities.map(([slug, city]) => (
        <View key={slug} style={styles.credit} testID={`photo-credit-${slug}`}>
          <AppText variant="heading">{city.name}</AppText>
          <MediaAttribution attribution={{ text: city.credit!.text }} />
          {city.credit?.href ? (
            <PressableSurface accessibilityRole="link" accessibilityLabel={`${city.name}: source image`} onPress={() => void Linking.openURL(city.credit!.href)} style={styles.link}>
              <AppText style={styles.linkText}>Source image ↗</AppText>
            </PressableSurface>
          ) : null}
          {city.credit?.license ? (
            <PressableSurface accessibilityRole="link" accessibilityLabel={`${city.name}: image license`} onPress={() => void Linking.openURL(city.credit!.license)} style={styles.link}>
              <AppText style={styles.linkText}>{city.credit.license.includes("zero") ? "CC0 1.0 ↗" : "CC BY-SA 3.0 ↗"}</AppText>
            </PressableSurface>
          ) : null}
        </View>
      ))}
      <View style={styles.credit}>
        <AppText variant="heading">CITYWALK original illustrations</AppText>
        <AppText variant="metadata" style={styles.detail}>
          The Home multi-city illustration is an original CITYWALK asset.
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs, paddingBottom: spacing.md },
  detail: { color: colors.textMuted, lineHeight: 22 },
  credit: { gap: spacing.xs, paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  link: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center" },
  linkText: { color: colors.primary, textDecorationLine: "underline" },
});
