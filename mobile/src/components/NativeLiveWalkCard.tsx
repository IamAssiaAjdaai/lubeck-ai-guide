import { t } from "@citywalk/i18n";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import type { LiveWalkPresentation } from "../lib/liveWalkPresentation";
import { colors, radius, spacing } from "../design/tokens";
import { usePremiumAccess } from "../hooks/usePremiumAccess";
import { useNativeLocale } from "../localization/LocaleProvider";
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
  const { locale } = useNativeLocale();

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
            {t(locale, "premium.eyebrow")}
          </AppText>
        </View>

        <AppText style={styles.gateTitle}>{t(locale, "premium.startLiveWalk")}</AppText>
        <AppText variant="metadata" style={styles.secondary}>
          {t(locale, "premium.stayGuided")}
        </AppText>

        <View style={styles.benefitList}>
          <PremiumBenefit text={t(locale, "premium.benefitLockScreen")} />
          <PremiumBenefit text={t(locale, "premium.benefitEta")} />
          <PremiumBenefit text={t(locale, "premium.benefitAdapt")} />
          <PremiumBenefit text={t(locale, "premium.benefitBackOnTime")} />
          <PremiumBenefit text={t(locale, "premium.benefitAudioAi")} />
        </View>

        {premium.status === "loading" ? (
          <AppText variant="metadata" style={styles.secondary}>
            {t(locale, "premium.checkingAccount")}
          </AppText>
        ) : premium.status === "unavailable" ? (
          <AppText variant="metadata" style={styles.secondary}>
            {t(locale, "profile.passUnavailableDescription")}
          </AppText>
        ) : (
          <PrimaryButton
            label={t(locale, "premium.unlock")}
            onPress={() => router.push("/premium")}
          />
        )}

        {onContinue ? (
          <PrimaryButton
            compact
            label={t(locale, "premium.continueBasicRoute")}
            tone="secondary"
            disabled={continueDisabled}
            onPress={onContinue}
          />
        ) : null}
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
            size={16}
          />
          <AppText variant="caption" style={styles.state}>
            {props.stateLabel}
          </AppText>
        </View>
        <AppText variant="caption" style={styles.liveLabel}>
          {t(locale, "liveWalk.liveWalk")}
        </AppText>
      </View>

      <AppText style={styles.destination}>
        {props.destination}
      </AppText>

      {props.storyLabel ? (
        <View style={styles.distanceRow}>
          <NativeIcon ios="book" android="menu_book" color={colors.textMuted} size={15} />
          <AppText variant="metadata" style={styles.primaryMeta}>
            {props.storyLabel}
          </AppText>
        </View>
      ) : props.distanceEta ? (
        <View style={styles.distanceRow}>
          <NativeIcon ios="figure.walk" android="directions_walk" color={colors.text} size={17} />
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
            <NativeIcon ios="clock" android="schedule" color={colors.textMuted} size={15} />
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
              <NativeIcon ios="checkmark" android="check" color={colors.primary} size={13} />
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

function PremiumBenefit({ text }: Readonly<{ text: string }>) {
  return (
    <View style={styles.benefitRow}>
      <NativeIcon ios="checkmark" android="check" color={colors.success} size={16} />
      <AppText variant="metadata" style={styles.benefitText}>
        {text}
      </AppText>
    </View>
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
    gap: spacing.xs,
    padding: spacing.sm,
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
  gateTitle: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  benefitList: {
    gap: spacing.xs,
    marginVertical: spacing.xs,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  benefitText: {
    color: colors.text,
    flex: 1,
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
    letterSpacing: 1.2,
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
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "800",
    letterSpacing: -0.25,
  },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  primaryMeta: { color: colors.text },
  secondary: { color: colors.textMuted },
  progressBlock: { gap: 1 },
  progress: {
    minHeight: 18,
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
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  dotComplete: { backgroundColor: colors.primary },
  dotActive: {
    width: 16,
    height: 16,
    backgroundColor: colors.primary,
  },
  dotInner: {
    width: 8,
    height: 8,
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
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  finishPrimary: { color: colors.text, fontWeight: "700" },
  schedule: { color: colors.primary, fontWeight: "700", textAlign: "right" },
  continueButton: {
    marginTop: 2,
    backgroundColor: colors.primary,
  },
});
