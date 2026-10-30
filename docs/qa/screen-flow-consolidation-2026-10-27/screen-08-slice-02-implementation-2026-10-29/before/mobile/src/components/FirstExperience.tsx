import { isCityLaunched } from "@citywalk/traveler-core/cityAvailability";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import lubeckPhoto from "../../assets/images/introduction-holstentor.jpg";
import type { PublicMedia } from "../lib/api/contracts";
import { citywalkApi } from "../lib/api/instance";
import { selectImageUrl, selectPrimaryImageMedia } from "../lib/api/media";
import { firstExperienceCopy } from "../lib/firstExperienceCopy";
import { introductionCopy } from "../lib/introductionCopy";
import { nativeCityName } from "../lib/displayNames";
import { welcomePhotos } from "../lib/welcomeCopy";
import { useNativeLocale } from "../localization/LocaleProvider";
import { AppText, PressableSurface, PrimaryButton, StatusMessage } from "./ui";
import { CityPhotoCredits } from "./CityPhotoCredits";
import { LocaleSelector } from "./LocaleSelector";
import { NativeContentImage } from "./NativeContentImage";
import { NativeIcon } from "./NativeIcon";

export function FirstExperience({ citySlug, cityName, cityMedia = [], onExplore, onBack }: {
  citySlug: string; cityName: string; cityMedia?: readonly PublicMedia[]; onExplore: () => void; onBack: () => void;
}) {
  const { locale, direction, messages } = useNativeLocale();
  const { height, fontScale } = useWindowDimensions();
  const available = isCityLaunched(citySlug);
  const name = nativeCityName(citySlug, cityName, locale);
  const copy = firstExperienceCopy[locale];
  // A bundled image is mapped only to its own city. Other cities use their own published media.
  const bundled = citySlug === "lubeck";
  const media = selectPrimaryImageMedia(cityMedia);
  const uri = selectImageUrl(media, undefined, undefined, "hero");
  const source = bundled ? lubeckPhoto : uri ? { uri: citywalkApi.resolveUrl(uri) } : undefined;
  return <View style={styles.root}>
    <Stack.Screen options={{ headerShown: false }} /><StatusBar style="dark" />
    <SafeAreaView style={styles.safe}>
      <View style={[styles.header, { direction }]}>
        <PressableSurface accessibilityRole="button" accessibilityLabel={introductionCopy[locale].back} onPress={onBack} style={styles.back}><NativeIcon ios={direction === "rtl" ? "chevron.right" : "chevron.left"} android={direction === "rtl" ? "chevron_right" : "chevron_left"} size={22} color="#09234D" /></PressableSurface>
        <LocaleSelector welcome />
      </View>
      {available ? <>
        <ScrollView key={`entry-${fontScale}`} contentContainerStyle={styles.content} alwaysBounceVertical={false}>
          <View style={[styles.hero, { height: fontScale > 1.3 ? 190 : height < 740 ? 250 : 350 }]}>
            <NativeContentImage source={source} contentFit="cover" contentPosition="center" accessibilityLabel={name} style={styles.photo} />
            <CityPhotoCredits cityName={name} photo={bundled ? welcomePhotos.find(photo => photo.id === citySlug) : undefined} attribution={bundled ? undefined : media?.attribution} />
          </View>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.badge}><NativeIcon ios="checkmark.seal.fill" android="verified" size={42} color="#155CAF" /></View>
          <AppText accessibilityRole="header" style={[styles.title, fontScale > 1.5 && styles.largeTitle, fontScale > 2.5 && styles.largestTitle]}>{copy.title}</AppText>
          <AppText style={styles.description}>{copy.description.replace("{city}", name)}</AppText>
        </ScrollView>
        <View key={`entry-actions-${fontScale}`} style={styles.footer}><PrimaryButton wrapLabel label={copy.explore.replace("{city}", name)} onPress={onExplore} style={styles.primary} trailingIcon={fontScale > 1.3 ? undefined : <NativeIcon ios={direction === "rtl" ? "arrow.left" : "arrow.right"} android={direction === "rtl" ? "arrow_back" : "arrow_forward"} size={20} color="#FFFFFF" />} /></View>
      </> : <View style={styles.content}><StatusMessage>{messages.unavailable}</StatusMessage></View>}
    </SafeAreaView>
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FBFDFF" }, safe: { flex: 1 }, header: { paddingHorizontal: 20, paddingVertical: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, back: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
  content: { width: "100%", maxWidth: 480, alignSelf: "center", paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28, gap: 18 }, hero: { borderRadius: 28, overflow: "hidden", backgroundColor: "#E8F2FD" }, photo: { width: "100%", height: "100%" }, badge: { alignSelf: "center", marginTop: -48, width: 76, height: 76, borderRadius: 38, backgroundColor: "#FBFDFF", justifyContent: "center", alignItems: "center" },
  title: { fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", fontSize: 36, lineHeight: 42, letterSpacing: -0.6, fontWeight: "700", color: "#09234D", textAlign: "center" }, largeTitle: { fontSize: 28, lineHeight: 34 }, largestTitle: { fontSize: 16, lineHeight: 22 }, description: { color: "#506984", fontSize: 17, lineHeight: 26, textAlign: "center" },
  footer: { width: "100%", maxWidth: 480, alignSelf: "center", paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12 }, primary: { backgroundColor: "#155CAF" },
});
