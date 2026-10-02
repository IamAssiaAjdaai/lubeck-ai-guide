import { StyleSheet, View } from "react-native";

import type { LiveWalkPresentation } from "../lib/liveWalkPresentation";
import { radius, shadows, spacing } from "../design/tokens";
import { AppText, Card, PrimaryButton } from "./ui";
import { NativeIcon } from "./NativeIcon";

export function NativeLiveWalkCard({
  presentation,
  continueLabel,
  onContinue,
  continueDisabled = false,
}: Readonly<{
  presentation: LiveWalkPresentation;
  continueLabel?: string;
  onContinue?: () => void;
  continueDisabled?: boolean;
}>) {
  const { props } = presentation;
  const showProgress = props.state !== "take_back" && props.totalStops > 0;
  return (
    <Card style={styles.card}>
      <AppText variant="caption" style={styles.liveLabel}>
        LIVE WALK
      </AppText>

      <View style={styles.stateRow}>
        <NativeIcon
          ios={
            props.state === "arrived"
              ? "checkmark.circle.fill"
              : props.state === "take_back"
                ? "arrow.uturn.backward.circle.fill"
                : "location.fill"
          }
          android={
            props.state === "arrived"
              ? "check_circle"
              : props.state === "take_back"
                ? "undo"
                : "place"
          }
          color="#6EB6FF"
          size={22}
        />
        <AppText variant="metadata" style={styles.state}>
          {props.stateLabel}
        </AppText>
      </View>

      <AppText numberOfLines={2} style={styles.destination}>
        {props.destination}
      </AppText>

      {props.storyLabel ? (
        <View style={styles.distanceRow}>
          <NativeIcon ios="book" android="menu_book" color="#C9D8E8" size={18} />
          <AppText variant="label" style={styles.primaryMeta}>
            {props.storyLabel}
          </AppText>
        </View>
      ) : props.distanceEta ? (
        <View style={styles.distanceRow}>
          <NativeIcon ios="figure.walk" android="directions_walk" color="#FFFFFF" size={20} />
          <AppText variant="label" style={styles.primaryMeta}>
            {props.distanceEta}
          </AppText>
        </View>
      ) : null}

      {showProgress ? (
        <>
          <ProgressDots
            visited={props.visitedCount}
            total={props.totalStops}
          />
          <AppText variant="metadata" style={styles.secondary}>
            {props.progressLabel}
          </AppText>
        </>
      ) : null}

      <View style={styles.divider} />

      <View style={styles.timingRow}>
        <View style={styles.timingBlock}>
          <View style={styles.metaRow}>
            <NativeIcon ios="clock" android="schedule" color="#DCE8F4" size={18} />
            <AppText variant="label" style={styles.finishPrimary}>
              {props.remainingLabel}
            </AppText>
          </View>
          <AppText variant="metadata" style={styles.secondary}>
            {props.finishLabel}
          </AppText>
        </View>

        {props.scheduleLabel || props.deadlineLabel ? (
          <View style={[styles.timingBlock, styles.timingRight]}>
            <View style={styles.metaRow}>
              <AppText variant="label" style={styles.schedule}>
                {props.scheduleLabel ?? props.deadlineLabel}
              </AppText>
              <NativeIcon ios="checkmark" android="check" color="#77B8FF" size={16} />
            </View>
            {props.scheduleLabel && props.deadlineLabel ? (
              <AppText variant="metadata" style={styles.secondary}>
                {props.deadlineLabel}
              </AppText>
            ) : null}
          </View>
        ) : null}
      </View>

      {continueLabel && onContinue ? (
        <PrimaryButton
          label={continueLabel}
          disabled={continueDisabled}
          onPress={onContinue}
          style={styles.continueButton}
        />
      ) : null}
    </Card>
  );
}

function ProgressDots({
  visited,
  total,
}: Readonly<{ visited: number; total: number }>) {
  const count = Math.max(1, Math.min(total, 7));
  const current = Math.min(Math.max(visited, 0), count - 1);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: total,
        now: Math.min(visited, total),
      }}
      style={styles.progress}
    >
      {Array.from({ length: count }).map((_, index) => {
        const complete = index < visited;
        const active = index === current && visited < total;
        return (
          <View key={index} style={styles.progressItem}>
            {index > 0 ? (
              <View
                style={[
                  styles.connector,
                  index <= visited && styles.connectorComplete,
                ]}
              />
            ) : null}
            <View
              style={[
                styles.dotOuter,
                complete && styles.dotComplete,
                active && styles.dotActive,
              ]}
            >
              {active ? <View style={styles.dotInner} /> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#081624",
    borderColor: "#173249",
    borderRadius: 28,
    gap: 10,
    padding: spacing.md,
    ...shadows.card,
  },
  liveLabel: {
    color: "#6EB6FF",
    fontWeight: "800",
    letterSpacing: 2.4,
  },
  stateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  state: {
    color: "#AFC0CE",
    fontWeight: "600",
  },
  destination: {
    color: "#FFFFFF",
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  primaryMeta: { color: "#E7EEF5", fontSize: 17, lineHeight: 23 },
  secondary: { color: "#AFC0CE" },
  progress: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs,
    paddingHorizontal: 4,
  },
  progressItem: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: "#45596C",
  },
  connectorComplete: { backgroundColor: "#6EB6FF" },
  dotOuter: {
    width: 16,
    height: 16,
    borderRadius: radius.pill,
    backgroundColor: "#45596C",
    alignItems: "center",
    justifyContent: "center",
  },
  dotComplete: { backgroundColor: "#6EB6FF" },
  dotActive: {
    width: 26,
    height: 26,
    backgroundColor: "#6EB6FF",
  },
  dotInner: {
    width: 14,
    height: 14,
    borderRadius: radius.pill,
    backgroundColor: "#081624",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#2C4255",
    marginTop: spacing.xs,
  },
  timingRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  timingBlock: { flex: 1, minWidth: 0, gap: 2 },
  timingRight: { alignItems: "flex-end" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  finishPrimary: { color: "#FFFFFF", fontWeight: "700" },
  schedule: { color: "#77B8FF", fontWeight: "700", textAlign: "right" },
  continueButton: {
    marginTop: spacing.xs,
    backgroundColor: "#2E86E6",
  },
});
