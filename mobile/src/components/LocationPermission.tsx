import { Image } from "expo-image";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import world from "../../assets/images/location-world.svg";
import { introductionCopy } from "../lib/introductionCopy";
import { locationOnboardingCopy } from "../lib/locationOnboardingCopy";
import { useNativeLocale } from "../localization/LocaleProvider";
import { AppText, PressableSurface, PrimaryButton, StatusMessage } from "./ui";
import { NativeIcon } from "./NativeIcon";
import { LocaleSelector } from "./LocaleSelector";

/** No permission effects: only the explicit primary action calls the existing handler. */
export function LocationPermission({ busy, error, onUseLocation, onSkip, onBack }: {
  busy: boolean; error?: string; onUseLocation: () => void; onSkip: () => void; onBack: () => void;
}) {
  const { locale, direction } = useNativeLocale();
  const { height, fontScale } = useWindowDimensions();
  const copy = locationOnboardingCopy[locale];
  return <View style={styles.root}>
    <Stack.Screen options={{ headerShown: false }} /><StatusBar style="dark" />
    <SafeAreaView style={styles.safe}>
      <View style={[styles.header, { direction }]}>
        <PressableSurface accessibilityRole="button" accessibilityLabel={introductionCopy[locale].back} onPress={onBack} style={styles.back}><NativeIcon ios={direction === "rtl" ? "chevron.right" : "chevron.left"} android={direction === "rtl" ? "chevron_right" : "chevron_left"} size={22} color="#09234D" /></PressableSurface>
        <LocaleSelector welcome />
      </View>
      <ScrollView key={`location-content-${fontScale}`} contentContainerStyle={styles.content} alwaysBounceVertical={false}>
        <Image source={world} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" contentFit="contain" style={{ width: "100%", height: fontScale > 1.3 ? 140 : height < 740 ? 180 : 250 }} />
        <AppText accessibilityRole="header" style={[styles.title, fontScale > 1.5 && styles.largeTitle, fontScale > 2.5 && styles.largestTitle]}>{copy.title}</AppText>
        <AppText style={styles.description}>{copy.description}</AppText>
        <View style={styles.benefits}>{copy.benefits.map(benefit => <View key={benefit} style={[styles.benefit, { direction }]}>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><NativeIcon ios="checkmark.circle.fill" android="check_circle" size={20} color="#155CAF" /></View>
          <AppText style={styles.benefitText}>{benefit}</AppText>
        </View>)}</View>
        {busy ? <AppText accessibilityLiveRegion="polite" style={styles.description}>{copy.requesting}</AppText> : null}
        {error ? <StatusMessage>{error}</StatusMessage> : null}
      </ScrollView>
      <View key={`location-actions-${fontScale}`} style={styles.footer}>
        <PrimaryButton wrapLabel label={copy.use} busy={busy} onPress={onUseLocation} style={styles.primary} />
        <PressableSurface accessibilityRole="button" accessibilityLabel={copy.skip} onPress={onSkip} style={styles.skip}><AppText variant="label" style={styles.skipLabel}>{copy.skip}</AppText></PressableSurface>
      </View>
    </SafeAreaView>
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FBFDFF" }, safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, back: { minHeight: 48, minWidth: 48, alignItems: "center", justifyContent: "center" },
  content: { width: "100%", maxWidth: 480, alignSelf: "center", paddingHorizontal: 24, paddingBottom: 24, gap: 18 },
  title: { fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", fontSize: 32, lineHeight: 38, letterSpacing: -0.6, fontWeight: "700", color: "#09234D" }, largeTitle: { fontSize: 26, lineHeight: 32 }, largestTitle: { fontSize: 16, lineHeight: 22 },
  description: { color: "#506984", fontSize: 16, lineHeight: 24 }, benefits: { gap: 12 }, benefit: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 36 }, benefitText: { flex: 1, color: "#09234D", fontSize: 15, lineHeight: 22 },
  footer: { width: "100%", maxWidth: 480, alignSelf: "center", paddingHorizontal: 24, paddingTop: 8, gap: 4, backgroundColor: "#FBFDFF" }, primary: { backgroundColor: "#155CAF" }, skip: { minHeight: 48, justifyContent: "center", alignItems: "center", paddingVertical: 12 }, skipLabel: { color: "#155CAF", textAlign: "center" },
});
