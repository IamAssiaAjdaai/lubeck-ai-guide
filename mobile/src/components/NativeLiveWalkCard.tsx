import { StyleSheet, View } from "react-native";

import type { LiveWalkPresentation } from "../lib/liveWalkPresentation";
import { colors, radius, shadows, spacing } from "../design/tokens";
import { AppText, Card } from "./ui";

export function NativeLiveWalkCard({
  presentation,
}: Readonly<{ presentation: LiveWalkPresentation }>) {
  const { props } = presentation;
  return (
    <Card style={styles.card}>
      <AppText variant="caption" style={styles.brand}>
        {props.cityLabel}
      </AppText>
      <AppText variant="caption" style={styles.eyebrow}>
        {props.stateLabel}
      </AppText>
      <AppText variant="heading" numberOfLines={2} style={styles.destination}>
        {props.destination}
      </AppText>
      {props.storyLabel ? (
        <AppText variant="label" style={styles.primaryMeta}>
          {props.storyLabel}
        </AppText>
      ) : props.distanceEta ? (
        <AppText variant="label" style={styles.primaryMeta}>
          {props.distanceEta}
        </AppText>
      ) : null}
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: 100,
          now: Math.round(props.progress * 100),
          text: props.progressLabel,
        }}
        style={styles.track}
      >
        <View
          style={[
            styles.fill,
            { width: String(Math.round(props.progress * 100)) + "%" },
          ]}
        />
      </View>
      <View style={styles.row}>
        <AppText variant="metadata" style={styles.secondary}>
          {props.progressLabel}
        </AppText>
        <AppText variant="metadata" style={styles.secondary}>
          {props.remainingLabel}
        </AppText>
      </View>
      <View style={styles.row}>
        <AppText variant="metadata" style={styles.finish}>
          {props.finishLabel}
        </AppText>
        {props.scheduleLabel || props.deadlineLabel ? (
          <AppText
            variant="metadata"
            style={props.scheduleLabel ? styles.schedule : styles.secondary}
          >
            {props.scheduleLabel ?? props.deadlineLabel}
          </AppText>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#081624",
    borderColor: "#173249",
    borderRadius: radius.hero,
    gap: spacing.sm,
    padding: spacing.md,
    ...shadows.card,
  },
  brand: {
    color: "#58B9EA",
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  eyebrow: {
    color: "#91A4B5",
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  destination: { color: "#FFFFFF" },
  primaryMeta: { color: "#D5DEE6" },
  secondary: { color: "#AFC0CE" },
  finish: { color: "#FFFFFF" },
  schedule: { color: "#58B9EA", fontWeight: "700" },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: "#244055",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
});
