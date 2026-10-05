import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import type { LiveWalkPresentation } from "../lib/liveWalkPresentation";
import { colors, radius, spacing } from "../design/tokens";
import { usePremiumAccess } from "../hooks/usePremiumAccess";
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
  const premium = usePremiumAccess();

  if (!premium.active) {
    return (
      <Card style={styles.premiumGate}>
        <View style={styles.premiumHeader}>
          <NativeIcon
            ios="sparkles"
            android="auto_awesome"
            color={colors.primary}
            size={18}
          />
          <AppText variant="caption" style={styles.liveLabel}>
            CITYWALK PREMIUM
          </AppText>
        </View>
        <AppText variant="label">Live Walk</AppText>
        <AppText variant="metadata" style={styles.secondary}>
          Live next-stop guidance, ETA, remaining time and adaptive trip controls.
        </AppText>
        {premium.status === "loading" ? (
          <AppText variant="metadata" style={styles.secondary}>
            Checking Premium access…
          </AppText>
        ) : premium.status === "unavailable" ? (
          <AppText variant="metadata" style={styles.secondary}>
            Premium access could not be checked right now. Your basic walk still works.
          </AppText>
        ) : (
          <PrimaryButton
            compact
            label="Unlock Live Walk"
            onPress={() => router.push("/premium")}
          />
        )}
      </Card>
    );
  }

  const { props } = presentation;
  const showProgress = props.state !== "take_back" && props.totalStops > 0;

  return (
    <Card style={styles.card}>
      <View style={styles.topRow}>
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
            color={colors.primary}
            size={18}
          />
          <AppText variant="caption" style={styles.state}>
            {props.stateLabel}
          </AppText>
        </View>
        <AppText variant="caption" style={styles.liveLabel}>
          LIVE WALK
        </AppText>
      </View>

      <AppText numberOfLines={2} style={styles.destination}>
        {props.destination}
      </AppText>

      {props.storyLabel ? (
        <View style={styles.distanceRow}>
          <NativeIcon ios="book" android="menu_book" color={colors.textMuted} size={16} />
          <AppText variant="metadata" style={styles.primaryMeta}>
            {props.storyLabel}
          </AppText>
        </View>
      ) : props.distanceEta ? (
        <View style={styles.distanceRow}>
          <NativeIcon ios="figure.walk" android="directions_walk" color={colors.text} size={18} />
          <AppText variant="label" style={styles.primaryMeta}>
            {props.distanceEta}
          </AppText>
        </View>
      ) : null}

      {showProgress ? (
        <View style={styles.progressBlock}>
          <ProgressDots visited={props.visitedCount} total={props.totalStops} />
          <AppText variant="caption" style={styles.secondary}>
            {props.progressLabel}
          </AppText>
        </View>
      ) : null}

      <View style={styles.divider} />

      <View style={styles.timingRow}>
        <View style={styles.timingBlock}>
          <View style={styles.metaRow}>
            <NativeIcon ios="clock" android="schedule" color={colors.textMuted} size={16} />
            <AppText variant="label" style={styles.finishPrimary}>
              {props.remainingLabel}
            </AppText>
          </View>
          <AppText variant="caption" style={styles.secondary}>
            {props.finishLabel}
          </AppText>
        </View>

        {props.scheduleLabel || props.deadlineLabel ? (
          <View style={[styles.timingBlock, styles.timingRight]}>
            <View style={styles.metaRow}>
              <AppText variant="label" style={styles.schedule}>
                {props.scheduleLabel ?? props.deadlineLabel}
              </AppText>
              <NativeIcon ios="checkmark" android="check" color={colors.primary} size={14} />
            </View>
            {props.scheduleLabel && props.deadlineLabel ? (
              <AppText variant="caption" style={styles.secondary}>
                {props.deadlineLabel}
              </AppText>
            ) : null}
          </View>
        ) : null}
      </View>

      {continueLabel && onContinue ? (
        <PrimaryButton
          compact
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
          <View
            key={index}
            style={[
              styles.progressStep,
              index < count - 1 && styles.progressStepGrow,
            ]}
          >
            <View
              style={[
                styles.dotOuter,
                complete && styles.dotComplete,
                active && styles.dotActive,
              ]}
            >
              {active ? <View style={styles.dotInner} /> : null}
            </View>
            {index < count - 1 ? (
              <View
                style={[
                  styles.connector,
                  index < visited && styles.connectorComplete,
                ]}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    gap: spacing.sm,
    padding: spacing.md,
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  premiumGate: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    gap: spacing.sm,
    padding: spacing.md,
  },
  premiumHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  liveLabel: {
    color: colors.primary,
    fontWeight: "800",
    letterSpacing: 1.6,
  },
  stateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  state: {
    color: colors.textMuted,
    fontWeight: "600",
  },
  destination: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  primaryMeta: { color: colors.text },
  secondary: { color: colors.textMuted },
  progressBlock: { gap: 2 },
  progress: {
    minHeight: 22,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  progressStep: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressStepGrow: { flex: 1, minWidth: 0 },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: colors.borderStrong,
  },
  connectorComplete: { backgroundColor: colors.primary },
  dotOuter: {
    width: 12,
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  dotComplete: { backgroundColor: colors.primary },
  dotActive: {
    width: 20,
    height: 20,
    backgroundColor: colors.primary,
  },
  dotInner: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  timingRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  timingBlock: { flex: 1, minWidth: 0, gap: 1 },
  timingRight: { alignItems: "flex-end" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  finishPrimary: { color: colors.text, fontWeight: "700" },
  schedule: { color: colors.primary, fontWeight: "700", textAlign: "right" },
  continueButton: {
    marginTop: 2,
    backgroundColor: colors.primary,
  },
});
