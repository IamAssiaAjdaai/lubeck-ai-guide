import { StyleSheet, View } from "react-native";

import { colors, radius, spacing } from "../design/tokens";
import { AppText } from "./ui";

export function TripProgress({
  current,
  label,
  total,
}: Readonly<{ current: number; label: string; total: number }>) {
  const progress = total > 0 ? Math.min(Math.max(current / total, 0), 1) : 0;
  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: current }}
      style={styles.container}
    >
      <View style={styles.row}>
        <AppText variant="label" style={styles.label}>{label}</AppText>
        <AppText variant="caption" style={styles.count}>{current}/{total}</AppText>
      </View>
      <View accessibilityElementsHidden style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  row: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  label: { color: colors.primary },
  count: { color: colors.textMuted },
  track: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, height: 5, overflow: "hidden" },
  fill: { backgroundColor: colors.primary, borderRadius: radius.pill, height: "100%" },
});
