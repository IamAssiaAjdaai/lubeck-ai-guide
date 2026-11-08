import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Linking, Modal, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import prague from "../../assets/images/welcome-prague.webp";
import hamburg from "../../assets/images/welcome-hamburg.webp";
import duesseldorf from "../../assets/images/welcome-duesseldorf.webp";
import lubeck from "../../assets/images/welcome-holstentor.webp";
import skyline from "../../assets/images/welcome-skyline.svg";
import overlay from "../../assets/images/welcome-overlay.svg";
import alternateOverlay from "../../assets/images/welcome-overlay-alternate.svg";
import headlineWash from "../../assets/images/welcome-headline-wash.svg";
import { LocaleSelector } from "../components/LocaleSelector";
import { NativeContentImage } from "../components/NativeContentImage";
import { NativeIcon } from "../components/NativeIcon";
import { AppText, PressableSurface, PrimaryButton } from "../components/ui";
import { colors, motion, radius, spacing } from "../design/tokens";
import { useReducedMotion } from "../lib/motion";
import { welcomeCopy, welcomePhotos } from "../lib/welcomeCopy";
import { useNativeLocale } from "../localization/LocaleProvider";

const photoSources = [prague, hamburg, duesseldorf, lubeck];

// Visual-review route only. Keep the existing launch and city deep links intact.
// Get Started opens the optional value story; Explore Cities keeps the direct guest exit.
export default function WelcomeScreen() {
  const { locale, direction } = useNativeLocale();
  const copy = welcomeCopy[locale];
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [photoIndex, setPhotoIndex] = useState(0);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [creditError, setCreditError] = useState(false);
  const photo = welcomePhotos[photoIndex];
  const discover = () => router.replace({ pathname: "/", params: { section: "cities" } });

  async function openCredit(url: string) {
    setCreditError(false);
    try { await Linking.openURL(url); } catch { setCreditError(true); }
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false, animation: reducedMotion ? "none" : "fade" }} />
      <StatusBar style="light" />
      <NativeContentImage
        source={photoSources[photoIndex]}
        fallbackSource={prague}
        onError={() => setPhotoIndex(0)}
        contentFit="cover"
        contentPosition="center"
        transition={reducedMotion ? 0 : motion.component}
        accessible={false}
        style={StyleSheet.absoluteFill}
      />
      <Image source={photoIndex === 0 ? overlay : alternateOverlay} contentFit="fill" style={StyleSheet.absoluteFill} accessible={false} pointerEvents="none" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView key={fontScale} alwaysBounceVertical={false} contentContainerStyle={[styles.content, { minHeight: height - insets.top - insets.bottom }]}>
          <View style={[styles.header, { direction }]}>
            <View style={styles.brand} accessible accessibilityRole="image" accessibilityLabel="CITYWALK">
              <Image source={skyline} contentFit="contain" style={styles.skyline} accessible={false} />
              <AppText allowFontScaling={false} style={styles.wordmark}>CITYWALK</AppText>
            </View>
            <LocaleSelector welcome />
          </View>
          <View style={styles.headlineArea}>
            <Image source={headlineWash} contentFit="fill" style={styles.headlineWash} accessible={false} pointerEvents="none" />
            <AppText accessibilityRole="header" style={[styles.headline, fontScale > 1.5 && styles.largeHeadline]}>{copy.title}</AppText>
          </View>
          <View style={styles.footer}>
            <View style={styles.creditRow}>
              <PressableSurface accessibilityRole="button" accessibilityLabel={copy.photoCredits} onPress={() => { setCreditError(false); setCreditsOpen(true); }} style={styles.creditControl}>
                <NativeIcon ios="info.circle" android="info_outline" color="#FFFFFF" size={19} />
              </PressableSurface>
            </View>
            <PrimaryButton label={copy.start} accessibilityLabel={copy.start} accessibilityHint={copy.guestHint} onPress={() => router.push("/introduction")} haptic="light" style={styles.start} labelStyle={styles.startLabel} trailingIcon={<NativeIcon ios={direction === "rtl" ? "arrow.left" : "arrow.right"} android={direction === "rtl" ? "arrow_back" : "arrow_forward"} color="#FFFFFF" size={22} />} />
            <PressableSurface accessibilityRole="button" accessibilityLabel={copy.explore} accessibilityHint={copy.guestHint} onPress={discover} style={styles.explore}>
              <AppText variant="label" style={styles.exploreLabel}>{copy.explore}</AppText>
            </PressableSurface>
            <View style={styles.photoControls}>
              <PressableSurface
                accessibilityRole="adjustable"
                accessibilityLabel={`${copy.showPhoto}: ${photo.city}`}
                accessibilityValue={{ text: `${photoIndex + 1} / ${welcomePhotos.length}` }}
                accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
                onAccessibilityAction={({ nativeEvent }) => setPhotoIndex(index => (index + (nativeEvent.actionName === "decrement" ? -1 : 1) + welcomePhotos.length) % welcomePhotos.length)}
                onPress={() => setPhotoIndex(index => (index + 1) % welcomePhotos.length)}
                style={styles.photoControl}
              >
                <View style={styles.dots} accessible={false}>
                  {welcomePhotos.map((item, index) => <View key={item.id} style={[styles.dot, index === photoIndex && styles.activeDot]} />)}
                </View>
              </PressableSurface>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
      <Modal visible={creditsOpen} transparent animationType={reducedMotion ? "none" : "fade"} onRequestClose={() => setCreditsOpen(false)}>
        <SafeAreaView style={styles.modalBackdrop}>
          <View accessibilityViewIsModal onAccessibilityEscape={() => setCreditsOpen(false)} style={styles.creditsCard}>
            <ScrollView contentContainerStyle={styles.creditsContent}>
              <AppText variant="heading" accessibilityRole="header">{copy.photoCredits}</AppText>
              <AppText variant="title">{photo.city}</AppText>
              <AppText>{photo.credit}</AppText>
              <AppText variant="metadata">{photo.licenseName}</AppText>
              <AppText style={styles.inspiration}>{copy.inspiration}</AppText>
              <PrimaryButton label={copy.source} tone="secondary" accessibilityRole="link" onPress={() => void openCredit(photo.source)} />
              <PrimaryButton label={copy.license} tone="secondary" accessibilityRole="link" onPress={() => void openCredit(photo.license)} />
              {creditError ? <AppText accessibilityRole="alert" style={styles.error}>{copy.creditError}</AppText> : null}
              <PrimaryButton label={copy.close} onPress={() => setCreditsOpen(false)} />
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primarySoft },
  safeArea: { flex: 1 },
  content: { flexGrow: 1, width: "100%", maxWidth: 600, alignSelf: "center", paddingHorizontal: spacing.lg },
  header: { height: 136, flexDirection: "row", alignItems: "flex-start", justifyContent: "flex-end" },
  brand: { position: "absolute", top: 4, left: 44, right: 44, alignItems: "center", gap: 12 },
  skyline: { width: 72, height: 80 },
  wordmark: { fontFamily: Platform.select({ ios: "AvenirNextCondensed-DemiBold", android: "sans-serif-condensed" }), fontSize: 44, lineHeight: 52, fontWeight: "700", letterSpacing: 0.2, color: colors.text, textAlign: "center", writingDirection: "ltr" },
  headlineArea: { marginTop: 40 },
  headlineWash: { position: "absolute", top: -40, bottom: -40, left: -spacing.lg, right: -spacing.lg },
  headline: { paddingHorizontal: 8, fontSize: 32, lineHeight: 40, fontWeight: "500", color: colors.text, textAlign: "center" },
  largeHeadline: { fontSize: 24, lineHeight: 34, backgroundColor: "rgba(251,253,255,0.9)", borderRadius: radius.md, paddingVertical: spacing.md },
  footer: { marginTop: "auto", paddingTop: spacing.xl },
  start: { minHeight: 72, borderRadius: 28, backgroundColor: colors.primary, shadowColor: "#03182D", shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  creditRow: { flexDirection: "row", justifyContent: "flex-end", paddingBottom: 4 },
  creditControl: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.pill, backgroundColor: "rgba(9,35,77,0.55)" },
  startLabel: { fontSize: 24, lineHeight: 30, fontWeight: "600" },
  explore: { minHeight: 48, maxWidth: "100%", alignSelf: "center", alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, marginTop: spacing.sm, borderRadius: radius.pill, backgroundColor: "rgba(9,35,77,0.82)" },
  exploreLabel: { color: "#FFFFFF", fontSize: 16, lineHeight: 24, textAlign: "center" },
  photoControls: { flexDirection: "row", direction: "ltr", justifyContent: "center", gap: 0, paddingTop: 2 },
  photoControl: { width: 104, height: 44, justifyContent: "center", alignItems: "center" },
  dots: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 4, backgroundColor: "rgba(251,253,255,0.55)" },
  activeDot: { width: 8, height: 8, backgroundColor: colors.background },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(9,35,77,0.65)", justifyContent: "center", padding: spacing.lg },
  creditsCard: { maxHeight: "90%", width: "100%", maxWidth: 480, alignSelf: "center", borderRadius: radius.hero, backgroundColor: colors.background, overflow: "hidden" },
  creditsContent: { gap: spacing.md, padding: spacing.lg },
  inspiration: { color: colors.textMuted },
  error: { color: colors.danger },
});
