import { Link } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { colors, radius, spacing } from "../design/tokens";
import type { PublicPlaceCard } from "../lib/api/contracts";
import {
  DEFAULT_NATIVE_TOUR_PREFERENCES,
  TOUR_INTERESTS,
  TOUR_TIME_BUDGETS,
  buildNativePersonalizedTour,
  formatNativeDistance,
  rankNativePlaces,
  type NativeTourPreferences,
  type NativeTourResult,
  type TourInterest,
  type TourTimeBudget,
} from "../lib/tourPlanning";
import { saveLocalTrip } from "../lib/tripStorage";
import { createMobileTripId, createMobileTripPlaceParams } from "../lib/tripNavigation";
import { triggerCitywalkHaptic } from "../lib/haptics";
import { useNativeLocale } from "../localization/LocaleProvider";
import { NativeIcon } from "./NativeIcon";
import { AppText, EmptyState, MotionView, PrimaryButton, StatusMessage } from "./ui";

const interestLabels = {
  history: "history",
  architecture: "architecture",
  "hidden-gems": "hiddenGems",
  family: "family",
} as const;

const budgetLabels = {
  60: "minutes60",
  90: "minutes90",
  120: "hours2",
  180: "hours3",
} as const;

export function NativeTourPlanner({
  citySlug,
  places,
  origin,
}: Readonly<{
  citySlug: string;
  places: readonly PublicPlaceCard[];
  origin: PublicPlaceCard["coordinates"];
}>) {
  const { direction, locale, messages } = useNativeLocale();
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState<NativeTourPreferences>(
    DEFAULT_NATIVE_TOUR_PREFERENCES,
  );
  const [timeBudget, setTimeBudget] = useState<TourTimeBudget>(90);
  const [result, setResult] = useState<NativeTourResult>();
  const [tripId, setTripId] = useState<string>();
  const [saveState, setSaveState] = useState<"saved" | "error">();
  const recommendations = useMemo(
    () => rankNativePlaces(places, preferences, origin).slice(0, 3),
    [origin, places, preferences],
  );

  function toggleInterest(interest: TourInterest) {
    void triggerCitywalkHaptic("light");
    setPreferences((current) => ({
      ...current,
      interests: TOUR_INTERESTS.filter((candidate) =>
        candidate === interest
          ? !current.interests.includes(candidate)
          : current.interests.includes(candidate)),
    }));
    setSaveState(undefined);
  }

  function buildTrip() {
    setResult(buildNativePersonalizedTour({
      places,
      preferences,
      timeBudgetMinutes: timeBudget,
      origin,
    }));
    setTripId(createMobileTripId("personalized"));
    setSaveState(undefined);
  }

  async function saveTrip() {
    if (!result) return;
    try {
      await saveLocalTrip({ citySlug, preferences, result, timeBudgetMinutes: timeBudget });
      setSaveState("saved");
      void triggerCitywalkHaptic("success");
    } catch {
      setSaveState("error");
      void triggerCitywalkHaptic("error");
    }
  }

  return (
    <View style={styles.shell}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => {
          void triggerCitywalkHaptic("light");
          setOpen((current) => !current);
        }}
        style={({ pressed }) => [styles.disclosure, pressed && styles.pressed]}
      >
        <View style={styles.disclosureLabel}>
          <NativeIcon ios="point.bottomleft.forward.to.point.topright.scurvepath" android="route" color={colors.primary} />
          <AppText variant="label" style={styles.disclosureText}>{messages.buildYourTrip}</AppText>
        </View>
        <NativeIcon ios={open ? "chevron.up" : "chevron.down"} android={open ? "keyboard_arrow_up" : "keyboard_arrow_down"} />
      </Pressable>

      {open ? (
        <MotionView style={styles.panel}>
          <View style={styles.plannerIntro}>
            <View style={styles.plannerIcon}>
              <NativeIcon ios="sparkles" android="auto_awesome" color={colors.violet} size={20} />
            </View>
            <View style={styles.plannerHeading}>
              <AppText variant="heading">{messages.buildYourTrip}</AppText>
              <AppText style={styles.muted}>{messages.plannerDescription}</AppText>
            </View>
          </View>

          <PlannerStep label={messages.interests} number={1} />
          <View style={[styles.chips, { direction }]}>
            {TOUR_INTERESTS.map((interest) => {
              const selected = preferences.interests.includes(interest);
              return (
                <Pressable
                  key={interest}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  onPress={() => toggleInterest(interest)}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <AppText variant="caption" style={selected ? styles.chipSelectedText : undefined}>
                    {messages[interestLabels[interest]]}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <PlannerStep label={messages.walkingPreference} number={2} />
          <View accessibilityRole="radiogroup" style={styles.twoColumns}>
            {(["standard", "less-walking"] as const).map((walkingPreference) => {
              const selected = preferences.walkingPreference === walkingPreference;
              return (
                <Pressable
                  key={walkingPreference}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => {
                    void triggerCitywalkHaptic("light");
                    setPreferences((current) => ({ ...current, walkingPreference }));
                    setSaveState(undefined);
                  }}
                  style={[styles.choice, selected && styles.choiceSelected]}
                >
                  <AppText variant="caption" style={styles.choiceText}>
                    {walkingPreference === "standard" ? messages.standardWalking : messages.lessWalking}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <PlannerStep label={messages.availableTime} number={3} />
          <View accessibilityRole="radiogroup" style={styles.twoColumns}>
            {TOUR_TIME_BUDGETS.map((budget) => (
              <Pressable
                key={budget}
                accessibilityRole="radio"
                accessibilityState={{ checked: timeBudget === budget }}
                onPress={() => {
                  void triggerCitywalkHaptic("light");
                  setTimeBudget(budget);
                  setSaveState(undefined);
                }}
                style={[styles.choice, timeBudget === budget && styles.choiceSelected]}
              >
                <AppText variant="caption" style={styles.choiceText}>{messages[budgetLabels[budget]]}</AppText>
              </Pressable>
            ))}
          </View>

          <View style={styles.recommendations}>
            <AppText variant="label">{messages.recommendedForYou}</AppText>
            {recommendations.map((place, index) => (
              <Link
                key={place.slug}
                href={{ pathname: "/city/[citySlug]/place/[placeSlug]", params: { citySlug, placeSlug: place.slug } }}
                asChild
              >
                <Pressable accessibilityRole="link" style={({ pressed }) => [styles.routeStop, pressed && styles.pressed]}>
                  <AppText variant="caption" style={styles.number}>{index + 1}</AppText>
                  <AppText variant="label" style={styles.stopName}>{place.content.name}</AppText>
                  <NativeIcon ios={direction === "rtl" ? "chevron.left" : "chevron.right"} android={direction === "rtl" ? "chevron_left" : "chevron_right"} color={colors.textSubtle} size={17} />
                </Pressable>
              </Link>
            ))}
          </View>

          <PrimaryButton
            haptic="medium"
            label={result ? messages.rebuildTrip : messages.buildTrip}
            leadingIcon={<NativeIcon ios="sparkles" android="auto_awesome" color="#FFFFFF" size={19} />}
            onPress={buildTrip}
          />

          {result ? (
            <MotionView accessibilityLiveRegion="polite" style={styles.result}>
              <AppText variant="heading">{messages.yourRoute}</AppText>
              {result.stops.length === 0 ? (
                <EmptyState
                  description={messages.noRoute}
                  icon={<NativeIcon ios="point.bottomleft.forward.to.point.topright.scurvepath" android="route" color={colors.primary} size={28} />}
                  title={messages.noRouteTitle}
                />
              ) : (
                <>
                  <View style={styles.summary}>
                    <Summary label={messages.stops} value={String(result.stops.length)} />
                    <Summary label={messages.totalTime} value={`${result.totalMinutes} ${messages.minutes}`} />
                    <Summary label={messages.walkingTime} value={`${result.totalWalkingMinutes} ${messages.minutes}`} />
                    <Summary label={messages.approximateDistance} value={formatNativeDistance(result.totalDistanceMeters, locale)} />
                  </View>
                  {result.stops.map(({ place }, index) => (
                    <View key={place.slug} style={styles.routeStop}>
                      <AppText variant="caption" style={styles.number}>{index + 1}</AppText>
                      <AppText variant="label" style={styles.stopName}>{place.content.name}</AppText>
                    </View>
                  ))}
                  <AppText variant="caption" style={styles.muted}>{messages.distanceDisclaimer}</AppText>
                  {tripId ? (
                    <Link
                      href={{
                        pathname: "/city/[citySlug]/place/[placeSlug]",
                        params: createMobileTripPlaceParams({
                          id: tripId,
                          citySlug,
                          stopSlugs: result.stops.map(({ place }) => place.slug),
                          source: "personalized",
                        }, 0),
                      }}
                      asChild
                    >
                      <PrimaryButton haptic="medium" label={messages.startTrip} />
                    </Link>
                  ) : null}
                  <PrimaryButton haptic="medium" label={messages.saveTrip} onPress={() => void saveTrip()} tone="secondary" />
                  {saveState === "saved" ? (
                    <MotionView><StatusMessage tone="success">{messages.tripSavedLocally}</StatusMessage></MotionView>
                  ) : null}
                  {saveState === "error" ? <StatusMessage tone="error">{messages.tripSaveFailed}</StatusMessage> : null}
                </>
              )}
            </MotionView>
          ) : null}
        </MotionView>
      ) : null}
    </View>
  );
}

function PlannerStep({ label, number }: Readonly<{ label: string; number: number }>) {
  return (
    <View style={styles.stepHeading}>
      <View style={styles.stepNumber}>
        <AppText variant="caption" style={styles.stepNumberText}>{number}</AppText>
      </View>
      <AppText variant="label">{label}</AppText>
    </View>
  );
}

function Summary({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <View style={styles.summaryItem}>
      <AppText variant="caption" style={styles.muted}>{label}</AppText>
      <AppText variant="label">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { gap: spacing.sm },
  disclosure: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 54,
    paddingHorizontal: spacing.md,
  },
  disclosureLabel: { alignItems: "center", flexDirection: "row", flexShrink: 1, gap: spacing.sm },
  disclosureText: { flexShrink: 1 },
  pressed: { backgroundColor: "#F3F4F6" },
  panel: { backgroundColor: colors.surface, borderRadius: radius.lg, gap: spacing.md, padding: spacing.md },
  plannerIntro: { alignItems: "flex-start", flexDirection: "row", gap: spacing.sm },
  plannerIcon: { alignItems: "center", backgroundColor: colors.violetSoft, borderRadius: radius.pill, height: 42, justifyContent: "center", width: 42 },
  plannerHeading: { flex: 1, gap: spacing.xs },
  stepHeading: { alignItems: "center", flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  stepNumber: { alignItems: "center", backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, height: 26, justifyContent: "center", width: 26 },
  stepNumberText: { color: colors.textMuted },
  muted: { color: colors.textMuted },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipSelectedText: { color: "#FFFFFF" },
  twoColumns: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  choice: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 48,
    padding: spacing.sm,
  },
  choiceSelected: { backgroundColor: "#DBEAFE", borderColor: colors.primary },
  choiceText: { textAlign: "center" },
  recommendations: { gap: spacing.xs },
  result: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.md, paddingTop: spacing.lg },
  summary: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  summaryItem: { backgroundColor: colors.surfaceMuted, borderRadius: radius.md, flexBasis: "47%", flexGrow: 1, padding: spacing.sm },
  routeStop: { alignItems: "center", flexDirection: "row", gap: spacing.sm, minHeight: 44 },
  number: { backgroundColor: colors.primary, borderRadius: radius.pill, color: "#FFFFFF", minWidth: 28, padding: spacing.xs, textAlign: "center" },
  stopName: { flex: 1 },
});
