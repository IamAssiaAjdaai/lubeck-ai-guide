import { t } from "@citywalk/i18n";
import type { WalkJourney } from "@citywalk/traveler-core/walkJourney";
import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { AppState, StyleSheet, View } from "react-native";
import { saveWalkFeedback } from "../lib/walkStorage";
import { storeReview } from "../lib/storeReview";
import { useNativeLocale } from "../localization/LocaleProvider";
import { colors, spacing } from "../design/tokens";
import { WalkChoices } from "./WalkControls";
import { AppText, Card, PressableSurface, PrimaryButton } from "./ui";

type FeedbackTag = "route" | "places" | "audio" | "hidden-gems";

// Mounted only on Finish. Private completion feedback is immediately available;
// the native/public store-review prompt remains an independent lifecycle below it.
export function PublicStoreReview(props: {
  journey: WalkJourney;
  onSettled?(id: string): void;
}) {
  const { journey } = props;
  const { locale } = useNativeLocale();
  const [fallback, setFallback] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [rating, setRating] = useState<string[]>([]);
  const [tags, setTags] = useState<FeedbackTag[]>([]);
  const lock = useRef(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    void storeReview.afterCompletion(journey, () => active && AppState.currentState === "active").then(() => {
      if (active) setFallback(Boolean(storeReview.configuredUrl()));
    });
    return () => { active = false; };
  }, [journey]));

  async function persistFeedback(key: "rating" | "tags", value: string) {
    setFeedbackBusy(true);
    try {
      await saveWalkFeedback(journey.id, key, value);
      setFeedbackMessage(t(locale, "walk.thanks"));
    } catch {
      setFeedbackMessage(t(locale, "trips.tripSaveFailed"));
    } finally {
      setFeedbackBusy(false);
    }
  }

  function toggleTag(tag: FeedbackTag) {
    const next = tags.includes(tag)
      ? tags.filter((value) => value !== tag)
      : [...tags, tag];
    setTags(next);
    void persistFeedback("tags", JSON.stringify(next));
  }

  return (
    <>
      <View style={styles.feedback}>
        <AppText variant="heading">{t(locale, "complete.ratingQuestion")}</AppText>
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((value) => (
            <PressableSurface
              key={value}
              accessibilityRole="radio"
              accessibilityLabel={`${value} / 5`}
              accessibilityState={{ checked: rating[0] === String(value) }}
              onPress={() => {
                setRating([String(value)]);
                void persistFeedback("rating", String(value));
              }}
              style={styles.ratingStar}
            >
              <AppText style={{ color: rating.length && Number(rating[0]) >= value ? colors.primary : colors.textMuted, fontSize: 28 }}>
                {"★"}
              </AppText>
            </PressableSurface>
          ))}
        </View>
        <WalkChoices
          label=""
          multiple
          options={[
            { value: "route" as const, label: t(locale, "planner.yourRoute") },
            { value: "places" as const, label: t(locale, "place.places") },
            { value: "audio" as const, label: t(locale, "place.audioGuide") },
            { value: "hidden-gems" as const, label: t(locale, "planner.hiddenGems") },
          ]}
          selected={tags}
          onSelect={toggleTag}
        />
        {feedbackBusy ? (
          <AppText variant="metadata" style={styles.muted}>
            {t(locale, "loading.saving")}
          </AppText>
        ) : feedbackMessage ? (
          <AppText variant="metadata" style={styles.muted}>
            {feedbackMessage}
          </AppText>
        ) : null}
      </View>

      {fallback ? (
        <Card>
          <AppText variant="heading">{t(locale, "review.title")}</AppText>
          <AppText>{t(locale, "review.description")}</AppText>
          <PrimaryButton
            wrapLabel
            label={t(locale, "review.action")}
            busy={busy}
            onPress={() => {
              if (lock.current) return;
              lock.current = true;
              setBusy(true);
              void storeReview.openFallback().finally(() => {
                setBusy(false);
                setFallback(false);
                lock.current = false;
              });
            }}
          />
        </Card>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  feedback: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  muted: { color: colors.textMuted },
  ratingRow: { flexDirection: "row", flexWrap: "nowrap", gap: spacing.sm },
  ratingStar: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center" },
});
