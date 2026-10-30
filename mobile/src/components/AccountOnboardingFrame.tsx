import type { ReactNode } from "react";
import { Image } from "expo-image";
import journey from "../../assets/images/account-journey.svg";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText, PressableSurface } from "./ui";
import { LocaleSelector } from "./LocaleSelector";
import { NativeIcon } from "./NativeIcon";
import { useNativeLocale } from "../localization/LocaleProvider";
import { introductionCopy } from "../lib/introductionCopy";

/** Presentation only: account state, validation and providers stay in AccountScreen. */
export function AccountOnboardingFrame({ title, description, children, footer, onBack, choice = false }: { title: string; description: string; children: ReactNode; footer: ReactNode; onBack: () => void; choice?: boolean }) {
  const { direction, locale } = useNativeLocale();
  const { fontScale, height } = useWindowDimensions();
  return <View style={styles.root}>
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.header, { direction }]}>
          <PressableSurface accessibilityRole="button" accessibilityLabel={introductionCopy[locale].back} onPress={onBack} style={styles.back}>
            <NativeIcon ios={direction === "rtl" ? "chevron.right" : "chevron.left"} android={direction === "rtl" ? "chevron_right" : "chevron_left"} size={22} />
          </PressableSurface>
          <LocaleSelector welcome />
        </View>
        <ScrollView key={`account-content-${fontScale}`} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets={false} contentContainerStyle={[styles.content, height < 740 && styles.compact]}>
          {choice ? <Image source={journey} accessible={false} pointerEvents="none" contentFit="contain" style={[styles.journey, height < 740 && styles.compactJourney, fontScale > 1.5 && styles.largeTextJourney]} /> : null}
          <View style={styles.story}>
            <AppText accessibilityRole="header" style={[styles.title, { textAlign: direction === "rtl" ? "right" : "left" }, fontScale > 1.5 && styles.largeTitle, fontScale > 2.5 && styles.largestTitle]}>{title}</AppText>
            <AppText style={styles.description}>{description}</AppText>
          </View>
          <View style={styles.forms}>{children}</View>
          {choice ? <View style={styles.choiceFooter}>{footer}</View> : null}
        </ScrollView>
        {!choice ? <View key={`account-actions-${fontScale}`} style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FBFDFF" },
  journey: { width: "100%", height: 112, marginBottom: 24 },
  compactJourney: { height: 72, marginBottom: 18 },
  largeTextJourney: { height: 48, marginBottom: 16 },
  choiceFooter: { marginTop: 20, borderTopWidth: 1, borderTopColor: "#DDE8F2", paddingTop: 16, gap: 4 },
  safe: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 8 },
  back: { minWidth: 48, minHeight: 48, justifyContent: "center", alignItems: "center" },
  content: { flexGrow: 1, width: "100%", maxWidth: 480, alignSelf: "center", paddingHorizontal: 28, paddingTop: 16, paddingBottom: 28 },
  compact: { paddingTop: 8 },
  story: { marginBottom: 24, gap: 12 },
  title: { fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", fontSize: 42, lineHeight: 47, fontWeight: "700", letterSpacing: -1.2, color: "#09234D" },
  largeTitle: { fontSize: 30, lineHeight: 36 },
  largestTitle: { fontSize: 20, lineHeight: 26 },
  description: { fontSize: 17, lineHeight: 25, color: "#506984" },
  forms: { gap: 14 },
  footer: { width: "100%", maxWidth: 480, alignSelf: "center", paddingHorizontal: 28, paddingVertical: 8, gap: 4, backgroundColor: "#FBFDFF" },
});
