import { useState } from "react";
import { Linking, Modal, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { PublicMediaAttribution } from "../lib/api/contracts";
import { formatMediaAttribution } from "../lib/mediaAttribution";
import { welcomeCopy, type welcomePhotos } from "../lib/welcomeCopy";
import { useNativeLocale } from "../localization/LocaleProvider";
import { NativeIcon } from "./NativeIcon";
import { AppText, PressableSurface, PrimaryButton, StatusMessage } from "./ui";

type Photo = typeof welcomePhotos[number];
/** Independent from the destination link: credits stay available on disabled cities. */
export function CityPhotoCredits({ cityName, photo, attribution }: { cityName: string; photo?: Photo; attribution?: PublicMediaAttribution }) {
  const { locale } = useNativeLocale();
  const copy = welcomeCopy[locale];
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!photo && !attribution) return null;
  const sourceTitle = photo ? decodeURIComponent(photo.source.split("/").pop() ?? "").replace(/^File:/, "").replaceAll("_", " ") : undefined;
  const links = photo ? [{ label: copy.source, url: photo.source }, { label: `${copy.license} · ${photo.licenseName}`, url: photo.license }] : formatMediaAttribution(attribution!).filter(segment => segment.url);
  async function follow(url: string) {
    setFailed(false);
    try { await Linking.openURL(url); } catch { setFailed(true); }
  }
  return <>
    <PressableSurface accessibilityRole="button" accessibilityLabel={`${copy.photoCredits}: ${cityName}`} accessibilityState={{ expanded: open }} onPress={() => { setFailed(false); setOpen(true); }} style={styles.control}>
      <NativeIcon ios="info.circle" android="info_outline" color="#155CAF" size={21} />
    </PressableSurface>
    {open ? <Modal visible transparent animationType="none" onRequestClose={() => setOpen(false)}>
      <SafeAreaView style={styles.backdrop}>
        <View accessibilityViewIsModal onAccessibilityEscape={() => setOpen(false)} style={styles.sheet}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <AppText accessibilityRole="header" variant="heading">{cityName} · {copy.photoCredits}</AppText>
            {sourceTitle ? <AppText>{sourceTitle}</AppText> : null}
            <AppText>{photo ? photo.credit : formatMediaAttribution(attribution!).map(segment => segment.label).join(" · ")}</AppText>
            {photo ? <AppText variant="label">{photo.licenseName}</AppText> : null}
            {links.map(link => <PressableSurface key={link.url} accessibilityRole="link" accessibilityLabel={link.label} onPress={() => void follow(link.url!)} style={styles.link}>
              <AppText style={styles.linkText}>{link.label} ↗</AppText>
            </PressableSurface>)}
            {failed ? <StatusMessage tone="error">{copy.creditError}</StatusMessage> : null}
          </ScrollView>
          <View style={styles.footer}><PrimaryButton label={copy.close} tone="secondary" onPress={() => setOpen(false)} /></View>
        </View>
      </SafeAreaView>
    </Modal> : null}
  </>;
}
const styles = StyleSheet.create({
  control: { position: "absolute", top: 10, right: 10, minHeight: 48, minWidth: 48, borderRadius: 24, backgroundColor: "#FBFDFF", justifyContent: "center", alignItems: "center" },
  backdrop: { flex: 1, padding: 20, justifyContent: "center", backgroundColor: "rgba(9,35,77,0.55)" },
  sheet: { maxHeight: "90%", width: "100%", maxWidth: 480, alignSelf: "center", backgroundColor: "#FBFDFF", borderRadius: 24, overflow: "hidden" },
  scroll: { flexShrink: 1 },
  footer: { paddingHorizontal: 24, paddingBottom: 24, paddingTop: 8 },
  content: { padding: 24, gap: 16 },
  link: { minHeight: 48, justifyContent: "center", paddingVertical: 10 },
  linkText: { color: "#155CAF", textDecorationLine: "underline" },
});
