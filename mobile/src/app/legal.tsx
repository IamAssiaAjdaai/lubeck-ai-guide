import { t, type TranslationKey } from "@citywalk/i18n";
import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";

import { NativeIcon } from "../components/NativeIcon";
import { AppText, PressableSurface, Screen } from "../components/ui";
import { colors, spacing } from "../design/tokens";
import {
  CITYWALK_LEGAL_DESTINATIONS,
  openCitywalkLegalDestination,
  type CitywalkLegalDestination,
} from "../lib/legalLinks";
import { useNativeLocale } from "../localization/LocaleProvider";

const rows = [
  { destination: "privacy", title: "legal.privacy", detail: "legal.privacyDetail", ios: "hand.raised", android: "policy" },
  { destination: "terms", title: "legal.terms", detail: "legal.termsDetail", ios: "doc.text", android: "description" },
  { destination: "imprint", title: "legal.imprint", detail: "legal.imprintDetail", ios: "building.2", android: "business" },
  { destination: "accountDeletion", title: "legal.accountDeletion", detail: "legal.accountDeletionDetail", ios: "trash", android: "delete_forever" },
  { destination: "support", title: "legal.support", detail: "legal.supportDetail", ios: "envelope", android: "mail" },
] as const satisfies readonly {
  destination: CitywalkLegalDestination;
  title: TranslationKey;
  detail: TranslationKey;
  ios: Parameters<typeof NativeIcon>[0]["ios"];
  android: Parameters<typeof NativeIcon>[0]["android"];
}[];

export default function LegalScreen() {
  const { locale, direction } = useNativeLocale();
  const label = (key: TranslationKey) => t(locale, key);

  return (
    <Screen navigation={false}>
      <Stack.Screen options={{ title: label("legal.title") }} />
      <View style={styles.heading}>
        <AppText variant="screenTitle">{label("legal.title")}</AppText>
        <AppText variant="metadata" style={styles.secondary}>{label("legal.description")}</AppText>
      </View>

      <View style={styles.menu} testID="native-legal-menu">
        {rows.map((row, index) => (
          <PressableSurface
            key={row.destination}
            accessibilityRole="link"
            accessibilityLabel={label(row.title)}
            accessibilityHint={row.destination === "support" ? CITYWALK_LEGAL_DESTINATIONS.support : undefined}
            onPress={() => { void openCitywalkLegalDestination(row.destination); }}
            style={[styles.row, index < rows.length - 1 && styles.divider]}
          >
            <View style={styles.icon}>
              <NativeIcon ios={row.ios} android={row.android} color={colors.primary} size={21} />
            </View>
            <View style={styles.text}>
              <AppText variant="label">{label(row.title)}</AppText>
              <AppText variant="metadata" style={styles.secondary}>{label(row.detail)}</AppText>
            </View>
            <NativeIcon
              ios={direction === "rtl" ? "chevron.left" : "chevron.right"}
              android={direction === "rtl" ? "chevron_left" : "chevron_right"}
              color={colors.textMuted}
              size={16}
            />
          </PressableSurface>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: spacing.xs, paddingTop: spacing.xs, paddingBottom: spacing.sm },
  secondary: { color: colors.textMuted },
  menu: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  row: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  icon: { width: 32, alignItems: "center", justifyContent: "center" },
  text: { flex: 1, minWidth: 0, gap: 2 },
});
