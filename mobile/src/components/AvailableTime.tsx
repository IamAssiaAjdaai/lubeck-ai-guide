import type { ComponentProps, ReactNode } from "react";
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

/** Presentation only: minutes and deadline remain owned by NativeWalkFlow. */
export function AvailableTime({ citySlug, cityName, minutes, onSelect, onContinue, onBack, children }: {
  citySlug: string; cityName: string; minutes: number; onSelect: (minutes: number) => void; onContinue: () => void; onBack: () => void; children: ReactNode;
}) {
  const { locale, direction } = useNativeLocale();
  const { height, fontScale } = useWindowDimensions();
  const t = walkCopy(locale);
  const options: { value: number; label: string; description: string; ios: ComponentProps<typeof NativeIcon>["ios"]; android: ComponentProps<typeof NativeIcon>["android"] }[] = [
    { value: 60, label: t.hour1, description: t.quickWalk, ios: "clock", android: "schedule" },
    { value: 120, label: t.hour2, description: t.deeperWalk, ios: "sun.haze", android: "wb_twilight" },
    { value: 180, label: t.hour3, description: t.moreWalk, ios: "sun.max", android: "light_mode" },
    { value: 240, label: t.halfDay, description: t.relaxedWalk, ios: "sun.max.fill", android: "sunny" },
  ];
  // Preserve a hydrated duration such as the existing 90-minute account preference.
  if (minutes > 0 && !options.some(option => option.value === minutes)) options.unshift({ value: minutes, label: new Intl.NumberFormat(locale, { style: "unit", unit: "minute", unitDisplay: "long" }).format(minutes), description: t.deeperWalk, ios: "clock", android: "schedule" });
  const help = { en: "We’ll shape your walk around your time.", de: "Wir passen deinen Spaziergang an deine Zeit an.", es: "Adaptamos el paseo a tu tiempo.", nl: "We passen je wandeling aan je tijd aan.", da: "Vi tilpasser gåturen til din tid.", sv: "Vi anpassar promenaden efter din tid.", ar: "نكيّف جولتك مع الوقت المتاح لك." }[locale];
  return <View style={styles.root}>
    <Stack.Screen options={{ headerShown: false }} /><StatusBar style="dark" />
    <SafeAreaView style={styles.safe}>
      <View style={[styles.header, { direction }]}>
        <PressableSurface accessibilityRole="button" accessibilityLabel={introductionCopy[locale].back} onPress={onBack} style={styles.back}><NativeIcon ios={direction === "rtl" ? "chevron.right" : "chevron.left"} android={direction === "rtl" ? "chevron_right" : "chevron_left"} size={22} color="#09234D" /></PressableSurface>
        <LocaleSelector welcome />
      </View>
      <ScrollView key={`time-content-${fontScale}`} contentContainerStyle={[styles.content, height < 740 && styles.compact]} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <View style={[styles.city, { direction }]}><NativeIcon ios="mappin.and.ellipse" android="location_on" size={17} color="#155CAF" /><AppText style={styles.cityName}>{nativeCityName(citySlug, cityName, locale)}</AppText></View>
        <AppText accessibilityRole="header" style={[styles.title, fontScale > 1.5 && styles.largeTitle, fontScale > 2.5 && styles.largestTitle]}>{t.timeQuestion}</AppText>
        <AppText style={styles.help}>{help}</AppText>
        <View style={styles.choices}>
          {options.map(option => {
            const selected = minutes === option.value;
            return <PressableSurface key={option.value} accessibilityRole="radio" accessibilityLabel={`${option.label}. ${option.description}`} accessibilityState={{ checked: selected }} onPress={() => onSelect(option.value)} style={[styles.card, { direction }, selected && styles.selected, fontScale > 1.3 && styles.largeCard]}>
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><NativeIcon ios={option.ios} android={option.android} size={27} color={selected ? "#FFFFFF" : "#155CAF"} /></View>
              <View style={[styles.cardText, fontScale > 1.3 && styles.largeCardText]}><AppText variant="label" style={[styles.label, selected && styles.white]}>{option.label}</AppText><AppText style={[styles.description, selected && styles.white]}>{option.description}</AppText></View>
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={fontScale > 1.3 ? styles.largeCheck : undefined}><NativeIcon ios={selected ? "checkmark.circle.fill" : "circle"} android={selected ? "check_circle" : "radio_button_unchecked"} size={21} color={selected ? "#FFFFFF" : "#637D99"} /></View>
            </PressableSurface>;
          })}
        </View>
        <View style={styles.deadline}>{children}</View>
      </ScrollView>
      <View key={`time-actions-${fontScale}`} style={styles.footer}>
        <PrimaryButton label={t.continue} disabled={minutes <= 0} onPress={onContinue} style={styles.continue} trailingIcon={<NativeIcon ios={direction === "rtl" ? "arrow.left" : "arrow.right"} android={direction === "rtl" ? "arrow_back" : "arrow_forward"} size={20} color="#FFFFFF" />} />
        <PressableSurface accessibilityRole="button" accessibilityLabel={interestOnboardingCopy[locale].skip} onPress={onContinue} style={styles.skip}><AppText variant="label" style={styles.skipLabel}>{interestOnboardingCopy[locale].skip}</AppText></PressableSurface>
      </View>
    </SafeAreaView>
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FBFDFF" }, safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, back: { minHeight: 48, minWidth: 48, alignItems: "center", justifyContent: "center" },
  content: { width: "100%", maxWidth: 480, alignSelf: "center", paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24, gap: 14 }, compact: { paddingTop: 6, gap: 12 },
  city: { flexDirection: "row", alignItems: "center", gap: 6 }, cityName: { color: "#506984", fontSize: 14, lineHeight: 20 },
  title: { fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", fontSize: 36, lineHeight: 41, letterSpacing: -0.8, fontWeight: "700", color: "#09234D" }, largeTitle: { fontSize: 28, lineHeight: 34 }, largestTitle: { fontSize: 16, lineHeight: 22 }, help: { fontSize: 16, lineHeight: 24, color: "#506984" },
  choices: { gap: 10 }, card: { flexDirection: "row", alignItems: "center", gap: 16, minHeight: 80, borderWidth: 1, borderColor: "#DDE8F2", borderRadius: 16, backgroundColor: "#F1F6FC", padding: 16 }, selected: { backgroundColor: "#155CAF", borderColor: "#155CAF" },
  largeCard: { flexDirection: "column", alignItems: "flex-start" }, largeCardText: { flex: 0, alignSelf: "stretch" }, largeCheck: { position: "absolute", top: 16, right: 16 },
  cardText: { flex: 1, gap: 4 }, label: { color: "#09234D", fontSize: 17, lineHeight: 23 }, description: { color: "#506984", fontSize: 14, lineHeight: 20 }, white: { color: "#FFFFFF" }, deadline: { gap: 10, paddingTop: 4 },
  footer: { width: "100%", maxWidth: 480, alignSelf: "center", paddingHorizontal: 24, paddingTop: 8, gap: 4, backgroundColor: "#FBFDFF" }, continue: { backgroundColor: "#155CAF" }, skip: { minHeight: 48, justifyContent: "center", alignItems: "center", paddingVertical: 12 }, skipLabel: { color: "#155CAF", textAlign: "center" },
});
