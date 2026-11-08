import { Link } from "expo-router";
import { StyleSheet } from "react-native";
import type { PublicMediaAttribution } from "../lib/api/contracts";
import { photoCreditEntries, photoCreditsCopy } from "../lib/photoCredits";
import { welcomePhotos } from "../lib/welcomeCopy";
import { useNativeLocale } from "../localization/LocaleProvider";
import { colors } from "../design/tokens";
import { MediaAttribution } from "./MediaAttribution";
import { AppText, PressableSurface } from "./ui";

/** Only exact reviewed bundled records may use central credits. CMS notices stay adjacent. */
export function PlacePhotoCredit({ credit, attribution }: {
  credit?: (typeof welcomePhotos)[number];
  attribution?: PublicMediaAttribution;
}) {
  const { locale } = useNativeLocale();
  const entry = credit && photoCreditEntries.find(entry => entry.id === credit.id && entry.source === credit.source && entry.license === credit.license && entry.licenseName === credit.licenseName);
  if (!entry) return <MediaAttribution attribution={credit ? { text: `${credit.credit} · ${credit.source} · ${credit.licenseName} ${credit.license}` } : attribution} />;
  return <Link href={{ pathname: "/photo-credits", params: { image: entry.id } }} asChild>
    <PressableSurface accessibilityRole="link" accessibilityLabel={`${photoCreditsCopy(locale).title}: ${entry.title}`} style={styles.link}>
      <AppText variant="caption" style={styles.label}>{photoCreditsCopy(locale).title}</AppText>
    </PressableSurface>
  </Link>;
}
const styles = StyleSheet.create({
  link: { minHeight: 44, justifyContent: "center", paddingHorizontal: 12, paddingVertical: 8, alignSelf: "flex-start" },
  label: { color: colors.primary, textDecorationLine: "underline", flexShrink: 1 },
});
