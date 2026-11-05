import type { Interest } from "@citywalk/traveler-core/walkPlanner";
import { walkCopy } from "@citywalk/traveler-core/walkCopy";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { introductionCopy } from "../lib/introductionCopy";
import { interestOnboardingCopy } from "../lib/interestOnboardingCopy";
import { nativeCityName } from "../lib/displayNames";
import { useNativeLocale } from "../localization/LocaleProvider";
import { AppText, PressableSurface, PrimaryButton } from "./ui";
import { NativeIcon } from "./NativeIcon";
import { LocaleSelector } from "./LocaleSelector";

const choices = [
  { value: "history", ios: "building.columns", android: "account_balance" },
  { value: "food", ios: "fork.knife", android: "restaurant" },
  { value: "architecture", ios: "building.2", android: "apartment" },
  { value: "nature", ios: "leaf", android: "eco" },
  { value: "culture", ios: "paintpalette", android: "palette" },
  { value: "hidden-gems", ios: "sparkles", android: "auto_awesome" },
] as const satisfies readonly { value: Interest; ios: string; android: string }[];
const labels = {
  en: { history: "History & Culture", food: "Food & Local Life", architecture: "Architecture", nature: "Nature & Parks", culture: "Art & Museums", "hidden-gems": "Hidden Gems" },
  de: { history: "Geschichte & Kultur", food: "Essen & lokales Leben", architecture: "Architektur", nature: "Natur & Parks", culture: "Kunst & Museen", "hidden-gems": "Verborgene Schätze" },
};

/** Controlled presentation: the existing city walk planner owns Interest[] and persistence. */
export function SelectInterests({ citySlug, cityName, selected, onToggle, onContinue, onSkip, onBack }: {
  citySlug: string; cityName: string; selected: readonly Interest[]; onToggle: (interest: Interest) => void; onContinue: () => void; onSkip: () => void; onBack: () => void;
}) {
  const { locale, direction } = useNativeLocale();
  const { width, fontScale, height } = useWindowDimensions();
  const copy = interestOnboardingCopy[locale];
  const t = walkCopy(locale);
  const singleColumn = fontScale > 1.3 || width < 350;
  return <View style={styles.root}>
    <Stack.Screen options={{ headerShown: false }} />
    <StatusBar style="dark" />
    <SafeAreaView style={styles.safe}>
      <View style={[styles.header, { direction }]}>
        <PressableSurface accessibilityRole="button" accessibilityLabel={introductionCopy[locale].back} onPress={onBack} style={styles.back}>
          <NativeIcon ios={direction === "rtl" ? "chevron.right" : "chevron.left"} android={direction === "rtl" ? "chevron_right" : "chevron_left"} size={22} color="#09234D" />
        </PressableSurface>
        <LocaleSelector welcome />
      </View>
      <ScrollView key={`interest-content-${fontScale}`} contentContainerStyle={[styles.content, height < 740 && styles.compact]} alwaysBounceVertical={false}>
        <View style={[styles.city, { direction }]}><NativeIcon ios="mappin.and.ellipse" android="location_on" size={17} color="#155CAF" /><AppText style={styles.cityName}>{nativeCityName(citySlug, cityName, locale)}</AppText></View>
        <AppText accessibilityRole="header" style={[styles.title, fontScale > 1.5 && styles.largeTitle, fontScale > 2.5 && styles.largestTitle]}>{copy.title}</AppText>
        <AppText style={styles.help}>{copy.help}</AppText>
        <View style={[styles.grid, { direction }]}>
          {choices.map(choice => {
            const checked = selected.includes(choice.value);
            const label = (locale === "en" || locale === "de") ? labels[locale][choice.value] : t[choice.value];
            return <PressableSurface key={choice.value} accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked }} onPress={() => onToggle(choice.value)} style={[styles.card, checked && styles.selectedCard, singleColumn && styles.fullCard]}>
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.check}><NativeIcon ios={checked ? "checkmark.circle.fill" : "circle"} android={checked ? "check_circle" : "radio_button_unchecked"} size={18} color={checked ? "#FFFFFF" : "#637D99"} /></View>
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><NativeIcon ios={choice.ios} android={choice.android} size={27} color={checked ? "#FFFFFF" : "#155CAF"} /></View>
              <AppText variant="label" style={[styles.label, checked && styles.selectedLabel]}>{label}</AppText>
            </PressableSurface>;
          })}
        </View>
        <PressableSurface accessibilityRole="checkbox" accessibilityLabel={t.family} accessibilityState={{ checked: selected.includes("family") }} onPress={() => onToggle("family")} style={[styles.family, { direction }, selected.includes("family") && styles.familySelected]}>
          <NativeIcon ios="person.3" android="groups" size={22} color="#155CAF" />
          <AppText variant="label" style={styles.familyLabel}>{t.family}</AppText>
          <NativeIcon ios={selected.includes("family") ? "checkmark.circle.fill" : "circle"} android={selected.includes("family") ? "check_circle" : "radio_button_unchecked"} color="#155CAF" size={20} />
        </PressableSurface>
      </ScrollView>
      <View key={`interest-actions-${fontScale}`} style={styles.footer}>
        <PrimaryButton label={t.continue} disabled={!selected.length} onPress={onContinue} style={styles.continue} trailingIcon={<NativeIcon ios={direction === "rtl" ? "arrow.left" : "arrow.right"} android={direction === "rtl" ? "arrow_back" : "arrow_forward"} size={20} color="#FFFFFF" />} />
        <PressableSurface accessibilityRole="button" accessibilityLabel={copy.skip} onPress={onSkip} style={styles.skip}><AppText variant="label" style={styles.skipLabel}>{copy.skip}</AppText></PressableSurface>
      </View>
    </SafeAreaView>
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FBFDFF" }, safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  back: { minHeight: 48, minWidth: 48, alignItems: "center", justifyContent: "center" },
  content: { width: "100%", maxWidth: 480, alignSelf: "center", paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24, gap: 14 },
  compact: { paddingTop: 6, gap: 12 },
  city: { flexDirection: "row", alignItems: "center", gap: 6 }, cityName: { color: "#506984", fontSize: 14, lineHeight: 20 },
  title: { fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", fontSize: 36, lineHeight: 41, letterSpacing: -0.8, fontWeight: "700", color: "#09234D" },
  largeTitle: { fontSize: 28, lineHeight: 34 }, largestTitle: { fontSize: 16, lineHeight: 22 },
  help: { fontSize: 16, lineHeight: 24, color: "#506984" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: { flexBasis: "46%", flexGrow: 1, minWidth: 0, minHeight: 104, borderWidth: 1, borderColor: "#DDE8F2", borderRadius: 16, backgroundColor: "#F1F6FC", padding: 16, paddingTop: 22, gap: 10 },
  selectedCard: { backgroundColor: "#155CAF", borderColor: "#155CAF" }, fullCard: { flexBasis: "100%" },
  check: { position: "absolute", top: 10, right: 10 },
  label: { color: "#09234D", fontSize: 15, lineHeight: 21 }, selectedLabel: { color: "#FFFFFF" },
  family: { flexDirection: "row", minHeight: 52, alignItems: "center", gap: 12, padding: 14, borderWidth: 1, borderColor: "#DDE8F2", borderRadius: 14 },
  familySelected: { borderColor: "#155CAF", backgroundColor: "#E8F2FD" }, familyLabel: { flex: 1, color: "#09234D" },
  footer: { width: "100%", maxWidth: 480, alignSelf: "center", paddingHorizontal: 24, paddingTop: 8, gap: 4, backgroundColor: "#FBFDFF" },
  continue: { backgroundColor: "#155CAF" }, skip: { minHeight: 48, justifyContent: "center", alignItems: "center", paddingVertical: 12 }, skipLabel: { color: "#155CAF", textAlign: "center" },
});
