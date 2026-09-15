import { useEffect, useState } from "react";
import { ActivityIndicator, Animated, StyleSheet, View } from "react-native";

import { colors, radius, spacing } from "../design/tokens";
import { useNativeLocale } from "../localization/LocaleProvider";
import { useReducedMotion } from "../lib/motion";
import { AppText } from "./ui";

type LoadingVariant = "default" | "compact" | "home" | "city" | "place";

export function CitywalkLoading({
  compact = false,
  variant = compact ? "compact" : "default",
}: Readonly<{ compact?: boolean; variant?: LoadingVariant }>) {
  const { messages } = useNativeLocale();
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
      accessibilityLabel={messages.loading}
      accessibilityRole="progressbar"
      style={[styles.container, isCompact && styles.compact]}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.mark}
      >
        <View style={styles.route} />
        <View style={styles.pin} />
      </View>
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
      <View style={styles.loadingLabel}>
        <ActivityIndicator color={colors.primary} size="small" />
        <AppText variant="caption" style={styles.label}>{messages.loading}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    minHeight: 180,
    paddingVertical: spacing.lg,
  },
  compact: {
    minHeight: 96,
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
  loadingLabel: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  mark: {
    alignItems: "center",
    height: 28,
    justifyContent: "center",
    width: 58,
  },
  route: {
    borderColor: "#BFDBFE",
    borderRadius: radius.pill,
    borderStyle: "dashed",
    borderWidth: 2,
    height: 18,
    position: "absolute",
    transform: [{ rotate: "-10deg" }],
    width: 54,
  },
  pin: {
    backgroundColor: colors.primary,
    borderColor: "#DBEAFE",
    borderRadius: radius.pill,
    borderWidth: 4,
    height: 18,
    width: 18,
  },
  label: {
    color: colors.textMuted,
    textAlign: "center",
  },
});
