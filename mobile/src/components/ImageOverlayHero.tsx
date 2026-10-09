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

// Editorial is opt-in: planner, cards and all other legacy heroes keep their old crop.
export function ImageOverlayHero({ title, subtitle, compact = false, editorial = false, citySlug, badge }: {
  title: string;
  subtitle?: string;
  compact?: boolean;
  editorial?: boolean;
  citySlug?: string;
  badge?: string;
}) {
  const { direction } = useNativeLocale();
  const [size, setSize] = useState({ width: 0, height: 0 });
  return (
    <View testID="image-overlay-hero" style={[styles.hero, compact && styles.compactHero, editorial && styles.editorialHero]} onLayout={({ nativeEvent: { layout } }) => {
      setSize(previous => previous.width === layout.width && previous.height === layout.height
        ? previous : { width: layout.width, height: layout.height });
    }}>
      <View pointerEvents="none" style={styles.background} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {editorial ? (
          <>
            <NativeContentImage
              source={citySlug === "lubeck"
                ? require("../../assets/images/city-hub-lubeck-approved.webp")
                : require("../../assets/images/citywalk-waterfront.webp")}
              fallbackSource={require("../../assets/images/citywalk-waterfront.webp")}
              contentFit="cover"
              accessible={false}
              cachePolicy="memory-disk"
              style={styles.editorialImage}
            />
            <NativeContentImage
              source={require("../../assets/images/city-hub-overlay.svg")}
              contentFit="fill"
              accessible={false}
              style={styles.editorialGradient}
            />
          </>
        ) : size.width > 0 && size.height > 0 ? <NativeContentImage
          source={require("../../assets/images/citywalk-waterfront.webp")}
          contentFit="cover"
          accessible={false}
          style={[styles.art, waterfrontCrop(size.width, size.height)]}
        /> : null}
      </View>
      <View style={[styles.copy, compact && styles.compactCopy, editorial && styles.editorialCopy]}>
        {editorial ? <AppText style={styles.editorialEyebrow}>YOUR CITY, YOUR WAY</AppText> : null}
        <AppText accessibilityRole="header" variant="screenTitle" style={[styles.title, nativeTextStyle(direction), editorial && styles.editorialTitle]}>{title}</AppText>
        {subtitle ? <AppText style={[styles.subtitle, compact && styles.compactSubtitle, nativeTextStyle(direction), editorial && styles.editorialSubtitle]}>{subtitle}</AppText> : null}
        {editorial && badge ? (
          <View style={styles.editorialBadge}>
            <AppText variant="metadata" style={styles.editorialBadgeText}>{badge}</AppText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { minHeight: 244, justifyContent: "center", borderRadius: radius.hero, overflow: "hidden", backgroundColor: colors.primary },
  compactHero: { minHeight: 196 },
  editorialHero: { minHeight: 256, borderRadius: 27, backgroundColor: "#254E65", justifyContent: "flex-end" },
  // Physical coordinates deliberately stay LTR: Arabic aligns the real text,
  // never mirrors or repositions the illustration.
  background: { ...StyleSheet.absoluteFill, direction: "ltr", overflow: "hidden" },
  art: { position: "absolute" },
  editorialImage: { ...StyleSheet.absoluteFill },
  editorialGradient: { ...StyleSheet.absoluteFill },
  // Contrast follows the intrinsic text block, leaving the surrounding artwork
  // at its original brightness. No opacity is applied to the text or image.
  copy: { margin: spacing.md, padding: spacing.md, gap: spacing.sm, borderRadius: radius.sm, backgroundColor: "rgba(7, 30, 64, 0.68)" },
  compactCopy: { margin: spacing.sm, padding: spacing.md },
  editorialCopy: {
    margin: 0, paddingHorizontal: spacing.lg, paddingTop: 42, paddingBottom: spacing.lg,
    borderRadius: 0, backgroundColor: "transparent", gap: 6,
  },
  editorialEyebrow: { color: "#FFFFFF", fontSize: 11, lineHeight: 16, fontWeight: "800", letterSpacing: 2.1, textShadowColor: "rgba(0,15,27,0.75)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  editorialTitle: { fontFamily: "Georgia", fontWeight: "700", fontSize: 40, lineHeight: 47, letterSpacing: -1, textShadowColor: "rgba(0,15,27,0.45)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5 },
  editorialSubtitle: { fontSize: 15, lineHeight: 22, color: "#FFFFFF", textShadowColor: "rgba(0,15,27,0.76)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  editorialBadge: { alignSelf: "flex-start", borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.94)", paddingVertical: 6, paddingHorizontal: 12, marginTop: spacing.xs },
  editorialBadgeText: { color: "#124662", fontWeight: "700", fontSize: 11, lineHeight: 15 },
  title: { color: "#fff" },
  subtitle: { color: "#fff", fontSize: 17, lineHeight: 25 },
  compactSubtitle: { fontSize: 16, lineHeight: 23 },
});
