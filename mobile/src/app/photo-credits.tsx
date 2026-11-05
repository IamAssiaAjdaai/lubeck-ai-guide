import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";

import { AppText, PressableSurface, Screen, StatusMessage } from "../components/ui";
import { colors, spacing } from "../design/tokens";
import { nativeTextBlock } from "../design/rtlPresentation";
import { photoCreditEntries, photoCreditsCopy } from "../lib/photoCredits";
import { useNativeLocale } from "../localization/LocaleProvider";

export default function PhotoCreditsScreen() {
  const { locale, direction } = useNativeLocale();
  const { image } = useLocalSearchParams<{ image?: string | string[] }>();
  const copy = photoCreditsCopy(locale);
  const [failed, setFailed] = useState(false);
  // A detail link identifies its exact image first; the complete catalog stays available.
  const entries = [...photoCreditEntries].sort((a, b) => Number(b.id === image) - Number(a.id === image));
  async function follow(url: string) {
    setFailed(false);
    try { await Linking.openURL(url); } catch { setFailed(true); }
  }
  return <Screen navigation={false}>
    <Stack.Screen options={{ title: copy.title }} />
    <View style={[styles.header, nativeTextBlock(direction)]}>
      <AppText accessibilityRole="header" variant="screenTitle">{copy.title}</AppText>
      <AppText variant="metadata" style={styles.detail}>{copy.description}</AppText>
    </View>
    {failed ? <StatusMessage tone="error">{copy.failed}</StatusMessage> : null}
    {entries.map(entry => <View key={entry.id} style={[styles.credit, nativeTextBlock(direction)]} testID={`photo-credit-${entry.id}`}>
      <AppText accessibilityRole="header" variant="heading">{entry.location} · {entry.title}</AppText>
      <AppText>{copy.creator}: {entry.creator}</AppText>
      <AppText variant="label">{entry.licenseName}</AppText>
      <AppText variant="metadata" style={styles.detail}>{copy.usage}: {locale === "de" ? entry.de : entry.en}</AppText>
      <AppText variant="caption" style={styles.detail}>{copy.assets}: {entry.assets}</AppText>
      {[{ label: copy.source, url: entry.source }, { label: `${copy.license} · ${entry.licenseName}`, url: entry.license }].map(link => <PressableSurface key={link.url} accessibilityRole="link" accessibilityLabel={`${entry.location}: ${link.label}`} onPress={() => void follow(link.url)} style={styles.link}>
        <AppText style={styles.linkText}>{link.label} ↗</AppText>
      </PressableSurface>)}
    </View>)}
  </Screen>;
}
const styles = StyleSheet.create({
  header: { gap: spacing.sm, paddingBottom: spacing.md },
  detail: { color: colors.textMuted, lineHeight: 22 },
  credit: { gap: spacing.sm, paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  link: { minHeight: 44, justifyContent: "center", paddingVertical: 8 },
  linkText: { color: colors.primary, textDecorationLine: "underline" },
});
