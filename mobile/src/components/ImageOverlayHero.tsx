import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { nativeTextStyle } from "../design/rtlPresentation";
import { colors, radius, spacing } from "../design/tokens";
import { useNativeLocale } from "../localization/LocaleProvider";
import { NativeContentImage } from "./NativeContentImage";
import { AppText } from "./ui";

// The approved 1200 × 800 artwork has baked-in white sky/left fade. Frame its
// riverfront buildings and bridge instead: source rectangle (640, 360, 560, 400).
// Scale both axes equally and center-cover that rectangle, even as text grows.
export function waterfrontCrop(width: number, height: number) {
  const scale = Math.max(width / 560, height / 400);
  return {
    width: 1200 * scale,
    height: 800 * scale,
    left: -640 * scale - (560 * scale - width) / 2,
    top: -360 * scale - (400 * scale - height) / 2,
  };
}

export function ImageOverlayHero({ title, subtitle }: { title: string; subtitle?: string }) {
  const { direction } = useNativeLocale();
  const [size, setSize] = useState({ width: 0, height: 0 });
  return (
    <View testID="image-overlay-hero" style={styles.hero} onLayout={({ nativeEvent: { layout } }) => {
      setSize(previous => previous.width === layout.width && previous.height === layout.height
        ? previous : { width: layout.width, height: layout.height });
    }}>
      <View pointerEvents="none" style={styles.background} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {size.width > 0 && size.height > 0 ? <NativeContentImage
          source={require("../../assets/images/citywalk-waterfront.webp")}
          contentFit="cover"
          accessible={false}
          style={[styles.art, waterfrontCrop(size.width, size.height)]}
        /> : null}
      </View>
      <View style={styles.copy}>
        <AppText accessibilityRole="header" variant="screenTitle" style={[styles.title, nativeTextStyle(direction)]}>{title}</AppText>
        {subtitle ? <AppText style={[styles.subtitle, nativeTextStyle(direction)]}>{subtitle}</AppText> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { minHeight: 244, justifyContent: "center", borderRadius: radius.hero, overflow: "hidden", backgroundColor: colors.primary },
  // Physical coordinates deliberately stay LTR: Arabic aligns the real text,
  // never mirrors or repositions the illustration.
  background: { ...StyleSheet.absoluteFill, direction: "ltr", overflow: "hidden" },
  art: { position: "absolute" },
  // Contrast follows the intrinsic text block, leaving the surrounding artwork
  // at its original brightness. No opacity is applied to the text or image.
  copy: { margin: spacing.md, padding: spacing.md, gap: spacing.sm, borderRadius: radius.sm, backgroundColor: "rgba(7, 30, 64, 0.68)" },
  title: { color: "#fff" },
  subtitle: { color: "#fff", fontSize: 17, lineHeight: 25 },
});
