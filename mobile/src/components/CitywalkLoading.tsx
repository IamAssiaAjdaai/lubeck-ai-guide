import { ActivityIndicator, StyleSheet, View } from "react-native";

import { colors, radius, spacing } from "../design/tokens";
import { useNativeLocale } from "../localization/LocaleProvider";
import { AppText } from "./ui";

export function CitywalkLoading({ compact = false }: Readonly<{ compact?: boolean }>) {
  const { messages } = useNativeLocale();

  return (
    <View
      accessibilityLabel={messages.loading}
      accessibilityRole="progressbar"
      style={[styles.container, compact && styles.compact]}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.mark}
      >
        <View style={styles.route} />
        <View style={styles.pin} />
      </View>
      <ActivityIndicator color={colors.primary} size="small" />
      <AppText variant="caption" style={styles.label}>{messages.loading}</AppText>
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
