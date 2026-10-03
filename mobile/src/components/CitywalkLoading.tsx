import { useEffect, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { colors, radius, spacing } from "../design/tokens";
import { useNativeLocale } from "../localization/LocaleProvider";
import { useReducedMotion } from "../lib/motion";
import { AppText } from "./ui";
import { discoveryCopy } from "../design/discoveryCopy";

type LoadingVariant = "default" | "compact" | "home" | "city" | "place";

export function CitywalkLoading({
  compact = false,
  variant = compact ? "compact" : "default",
  label,
}: Readonly<{ compact?: boolean; variant?: LoadingVariant; label?: string }>) {
  const { messages, locale, direction } = useNativeLocale();
  const copy = discoveryCopy(locale);
  const loadingLabel = label ?? (variant === "city" ? copy.loadingCity : variant === "place" ? copy.loadingPlace : variant === "home" ? copy.loadingCities : messages.loading);
  const reducedMotion = useReducedMotion();
  const [pulse] = useState(() => new Animated.Value(0.62));
  const isCompact = variant === "compact";
  const hasHero = variant === "city" || variant === "place";
  const hasCards = variant === "home" || variant === "city";

  useEffect(() => {
    if (reducedMotion) {
      pulse.setValue(0.78);
      return;
    }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { duration: 650, toValue: 0.9, useNativeDriver: true }),
      Animated.timing(pulse, { duration: 650, toValue: 0.55, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [pulse, reducedMotion]);

  return (
    <View
      testID={`content-loading-${variant}`}
      accessibilityLabel={loadingLabel}
      accessibilityRole="progressbar"
      style={[styles.container, isCompact && styles.compact, { direction }, direction === "rtl" && { alignItems: "stretch" }]}
    >
      <Animated.View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.skeleton, isCompact && styles.compactSkeleton, { opacity: pulse }]}
      >
        {hasHero ? <View style={styles.heroPlaceholder} /> : null}
        <View style={styles.titlePlaceholder} />
        <View style={styles.copyPlaceholder} />
        {!isCompact ? <View style={styles.shortCopyPlaceholder} /> : null}
        {hasCards ? <View style={styles.cardPlaceholder} /> : null}
      </Animated.View>
      <AppText variant="caption" style={styles.label}>{loadingLabel}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    minHeight: 150,
    paddingVertical: spacing.lg,
  },
  compact: {
    minHeight: 82,
    paddingVertical: spacing.md,
  },
  skeleton: { alignSelf: "stretch", gap: spacing.sm },
  compactSkeleton: { alignItems: "center" },
  heroPlaceholder: {
    aspectRatio: 16 / 9,
    backgroundColor: "#E8EEF8",
    borderRadius: radius.lg,
    width: "100%",
  },
  titlePlaceholder: {
    backgroundColor: "#DCE6F4",
    borderRadius: radius.pill,
    height: 18,
    width: "62%",
  },
  copyPlaceholder: {
    backgroundColor: "#E8EEF8",
    borderRadius: radius.pill,
    height: 12,
    width: "88%",
  },
  shortCopyPlaceholder: {
    backgroundColor: "#E8EEF8",
    borderRadius: radius.pill,
    height: 12,
    width: "70%",
  },
  cardPlaceholder: {
    backgroundColor: "#EEF2F7",
    borderRadius: radius.lg,
    height: 110,
    marginTop: spacing.sm,
    width: "100%",
  },
  label: {
    color: colors.textMuted,
    textAlign: "center",
  },
});
