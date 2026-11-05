import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Linking, Modal, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import skyWash from "../../assets/images/introduction-sky-wash.svg";
import prague from "../../assets/images/welcome-prague.webp";
import hamburg from "../../assets/images/home-hamburg.webp";
import lubeck from "../../assets/images/introduction-holstentor.jpg";
import { LocaleSelector } from "../components/LocaleSelector";
import { NativeContentImage } from "../components/NativeContentImage";
import { NativeIcon } from "../components/NativeIcon";
import { AppText, PressableSurface, PrimaryButton } from "../components/ui";
import { colors, motion, radius, spacing } from "../design/tokens";
import { introductionCopy } from "../lib/introductionCopy";
import { useReducedMotion } from "../lib/motion";
import { welcomeCopy, welcomePhotos } from "../lib/welcomeCopy";
import { useNativeLocale } from "../localization/LocaleProvider";

const features = [
  { ios: "figure.walk", android: "directions_walk" },
  { ios: "map", android: "map" },
  { ios: "sparkles", android: "auto_awesome" },
  { ios: "bubble.left.and.bubble.right", android: "chat_bubble_outline" },
] as const;
const photos = [welcomePhotos[0], welcomePhotos[1], welcomePhotos[3]];

// Optional value story. Account creation remains optional with a guest discovery exit.
export default function IntroductionScreen() {
  const router = useRouter();
  const { locale, direction } = useNativeLocale();
  const copy = introductionCopy[locale];
  const common = welcomeCopy[locale];
  const reducedMotion = useReducedMotion();
  const { height, width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = height < 740 && fontScale <= 1.3;
  const collageHeight = fontScale > 1.5 ? 144 : Math.max(172, Math.min(width * 0.7, height - insets.top - insets.bottom - (compact ? 536 : 552)));
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [creditError, setCreditError] = useState(false);
  const discover = () => router.replace({ pathname: "/", params: { section: "cities" } });
  const back = () => router.canGoBack() ? router.back() : router.replace("/welcome");

  async function openCredit(url: string) {
    setCreditError(false);
    try { await Linking.openURL(url); } catch { setCreditError(true); }
  }

  return (
    <View style={styles.root}>
      <Image source={prague} contentFit="cover" contentPosition="top" style={styles.skyPhoto} accessible={false} pointerEvents="none" />
      <Image source={skyWash} contentFit="fill" style={styles.skyWash} accessible={false} pointerEvents="none" />
      <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false, animation: reducedMotion ? "none" : "fade" }} />
      <StatusBar style="dark" />
      <ScrollView key={fontScale} alwaysBounceVertical={false} style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={[styles.header, { direction }]}>
          <PressableSurface accessibilityRole="button" accessibilityLabel={copy.back} onPress={back} style={styles.back}>
            <NativeIcon ios={direction === "rtl" ? "chevron.right" : "chevron.left"} android={direction === "rtl" ? "chevron_right" : "chevron_left"} size={21} />
          </PressableSurface>
          <LocaleSelector welcome />
        </View>
        <View style={[styles.collage, { height: collageHeight }]}>
          <NativeContentImage source={prague} contentFit="cover" contentPosition={{ top: "43%", left: "50%" }} transition={reducedMotion ? 0 : motion.component} accessible={false} style={[styles.photo, styles.mainPhoto]} />
          <NativeContentImage source={hamburg} contentFit="cover" contentPosition={{ top: "24%", left: "50%" }} transition={reducedMotion ? 0 : motion.component} accessible={false} style={[styles.photo, styles.topPhoto]} />
          <NativeContentImage source={lubeck} contentFit="cover" contentPosition={{ top: "55%", left: "50%" }} transition={reducedMotion ? 0 : motion.component} accessible={false} style={[styles.photo, styles.frontPhoto]} />
          <PressableSurface accessibilityRole="button" accessibilityLabel={common.photoCredits} onPress={() => { setCreditError(false); setCreditsOpen(true); }} style={styles.creditControl}>
            <NativeIcon ios="info.circle" android="info_outline" color={colors.primary} size={20} />
          </PressableSurface>
        </View>
        <View style={styles.story}>
        <AppText accessibilityRole="header" style={[styles.title, compact && styles.compactTitle, fontScale > 1.5 && styles.largeTitle]}>{copy.title}</AppText>
        <AppText style={styles.description}>{copy.description}</AppText>
        <View style={styles.features}>
          {features.map((icon, index) => (
            <View key={icon.ios} style={[styles.feature, compact && styles.compactFeature, { direction }]}>
              <View style={styles.iconTile} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><NativeIcon {...icon} color={colors.primary} size={27} /></View>
              <View style={styles.featureCopy}>
                <AppText variant="label" style={styles.featureLabel}>{copy.features[index]}</AppText>
                <AppText style={styles.featureDescription}>{copy.featureDescriptions[index]}</AppText>
              </View>
            </View>
          ))}
        </View>
        <AppText variant="caption" style={styles.availability}>{copy.availability}</AppText>
        </View>
      </ScrollView>
      <View key={`actions-${fontScale}`} style={styles.footer}>
        <PrimaryButton label={copy.next} accessibilityLabel={copy.next} onPress={() => router.push({ pathname: "/account", params: { onboarding: "1" } })} haptic="light" style={styles.next} trailingIcon={<NativeIcon ios={direction === "rtl" ? "arrow.left" : "arrow.right"} android={direction === "rtl" ? "arrow_back" : "arrow_forward"} color="#FFFFFF" size={20} />} />
        <PressableSurface accessibilityRole="button" accessibilityLabel={common.explore} accessibilityHint={common.guestHint} onPress={discover} style={styles.skip}>
          <AppText variant="label" style={styles.skipLabel}>{common.explore}</AppText>
        </PressableSurface>
      </View>
      <Modal visible={creditsOpen} transparent animationType={reducedMotion ? "none" : "fade"} onRequestClose={() => setCreditsOpen(false)}>
        <SafeAreaView style={styles.modalBackdrop}>
          <View accessibilityViewIsModal onAccessibilityEscape={() => setCreditsOpen(false)} style={styles.creditsCard}>
            <ScrollView contentContainerStyle={styles.creditsContent}>
              <AppText variant="heading" accessibilityRole="header">{common.photoCredits}</AppText>
              <AppText>{common.inspiration}</AppText>
              {photos.map(photo => (
                <View key={photo.id} style={styles.photoCredit}>
                  <AppText variant="heading">{photo.city}</AppText>
                  <AppText>{photo.credit}</AppText>
                  <AppText variant="metadata">{photo.licenseName}</AppText>
                  <PrimaryButton label={common.source} accessibilityLabel={`${common.source}: ${photo.city}`} tone="secondary" accessibilityRole="link" onPress={() => void openCredit(photo.source)} />
                  <PrimaryButton label={common.license} accessibilityLabel={`${common.license}: ${photo.city}`} tone="secondary" accessibilityRole="link" onPress={() => void openCredit(photo.license)} />
                </View>
              ))}
            </ScrollView>
            {creditError ? <AppText accessibilityRole="alert" style={styles.error}>{common.creditError}</AppText> : null}
            <PrimaryButton label={common.close} onPress={() => setCreditsOpen(false)} style={styles.close} />
          </View>
        </SafeAreaView>
      </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  safeArea: { flex: 1 },
  skyPhoto: { position: "absolute", top: 0, width: "100%", height: 320, opacity: 0.35 },
  skyWash: { position: "absolute", top: 0, width: "100%", height: 320 },
  scroll: { flex: 1 },
  content: { flexGrow: 1, width: "100%", maxWidth: 480, alignSelf: "center" },
  header: { height: 44, paddingHorizontal: spacing.lg, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  collage: { marginTop: spacing.xs, marginBottom: 12, direction: "ltr" },
  photo: { position: "absolute", borderRadius: 28, backgroundColor: colors.primarySoft },
  mainPhoto: { top: 0, left: 0, width: "72%", height: "94%" },
  topPhoto: { top: 0, right: -2, width: "31%", height: "51%", borderWidth: 3, borderColor: colors.background, borderRadius: 26 },
  frontPhoto: { bottom: 0, right: -2, width: "38%", height: "57%", borderWidth: 3, borderColor: colors.background, borderRadius: 26 },
  creditControl: { position: "absolute", bottom: "10%", left: spacing.lg, width: 44, height: 44, alignItems: "center", justifyContent: "center", backgroundColor: colors.background, borderRadius: radius.pill },
  story: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  title: { fontFamily: Platform.select({ ios: "Georgia", android: "serif" }), fontSize: 36, lineHeight: 40, fontWeight: "700", letterSpacing: -0.8, color: colors.text, marginBottom: spacing.sm },
  largeTitle: { fontSize: 24, lineHeight: 32, letterSpacing: 0 },
  compactTitle: { fontSize: 30, lineHeight: 34 },
  description: { color: colors.textMuted, fontSize: 15, lineHeight: 20, marginBottom: spacing.md },
  features: { gap: 6 },
  feature: { flexDirection: "row", alignItems: "center", minHeight: 50, gap: 12, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: "rgba(251,253,255,0.96)" },
  compactFeature: { minHeight: 50 },
  iconTile: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.primarySoft },
  featureCopy: { flex: 1, gap: 2 },
  featureLabel: { fontSize: 14, lineHeight: 18, letterSpacing: -0.2 },
  featureDescription: { color: colors.textMuted, fontSize: 11.5, lineHeight: 15 },
  availability: { color: colors.textMuted, marginTop: spacing.sm },
  footer: { width: "100%", maxWidth: 480, alignSelf: "center", paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  next: { minHeight: 48, borderRadius: radius.pill },
  skip: { minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, alignItems: "center", justifyContent: "center" },
  skipLabel: { color: colors.primary, textAlign: "center" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(9,35,77,0.65)", justifyContent: "center", padding: spacing.lg },
  creditsCard: { maxHeight: "90%", width: "100%", maxWidth: 480, alignSelf: "center", borderRadius: radius.hero, backgroundColor: colors.background, overflow: "hidden" },
  creditsContent: { gap: spacing.md, padding: spacing.lg },
  photoCredit: { gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  close: { margin: spacing.md },
  error: { color: colors.danger, paddingHorizontal: spacing.lg },
});
