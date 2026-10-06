import { t as translate } from "@citywalk/i18n";
import type { WalkJourney } from "@citywalk/traveler-core/walkJourney";
import { useState } from "react";
import { Share, StyleSheet, View } from "react-native";
import type { PublicPlaceCard } from "../lib/api/contracts";
import { nativeCityName, nativePlaceName } from "../lib/displayNames";
import { saveWalkFeedback } from "../lib/walkStorage";
import { useNativeLocale } from "../localization/LocaleProvider";
import { colors, spacing } from "../design/tokens";
import { walkCopy } from "@citywalk/traveler-core/walkCopy";
import { NativeIcon } from "./NativeIcon";
import { PublicStoreReview } from "./PublicStoreReview";
import { MetricSummary, V2Itinerary } from "./V2Presentation";
import { WalkChoices } from "./WalkControls";
import {
  AppText,
  PrimaryButton,
  SectionTitle,
  StatusMessage,
} from "./ui";

type FeedbackTag = "route" | "places" | "audio" | "hidden-gems";

export function WalkCompletion({
  journey,
  citySlug,
  cityName,
  places,
  saveLabel,
  saveDisabled,
  saving,
  saveFeedback,
  onSave,
  onBack,
  onMessage,
}: {
  journey: WalkJourney;
  citySlug: string;
  cityName: string;
  places: readonly PublicPlaceCard[];
  saveLabel: string;
  saveDisabled: boolean;
  saving: boolean;
  saveFeedback?: React.ReactNode;
  onSave(): void;
  onBack(): void;
  onMessage(message: string): void;
}) {
  const { locale, messages } = useNativeLocale();
  const t = walkCopy(locale);
  const [rating, setRating] = useState<string[]>([]);
  const [tags, setTags] = useState<FeedbackTag[]>([]);
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const finishedAt = journey.finishedAt ?? Date.now();
  const durationMinutes = Math.max(0, Math.round((finishedAt - journey.startedAt) / 60000));
  const visited = journey.visited.flatMap((slug) => places.find((place) => place.slug === slug) ?? []);
  const distance = `${(journey.historyDistance / 1000).toFixed(1)} km`;
  const duration = durationMinutes >= 60
    ? `${Math.floor(durationMinutes / 60)} h ${String(durationMinutes % 60).padStart(2, "0")} min`
    : t.minutes.replace("{minutes}", String(durationMinutes));
  const title = t.finished.replace("{city}", nativeCityName(citySlug, cityName, locale));

  async function saveFeedback(key: "rating" | "tags", value: string) {
    if (feedbackSaving) return;
    setFeedbackSaving(true);
    try {
      await saveWalkFeedback(journey.id, key, value);
      onMessage(t.thanks);
    } catch {
      onMessage(messages.tripSaveFailed);
    } finally {
      setFeedbackSaving(false);
    }
  }

  function toggleTag(tag: FeedbackTag) {
    const next = tags.includes(tag)
      ? tags.filter((value) => value !== tag)
      : [...tags, tag];
    setTags(next);
    void saveFeedback("tags", JSON.stringify(next));
  }

  function share() {
    void Share.share({
      message: `${title}\n${duration} · ${distance} · ${journey.visited.length} ${t.stops}\n${visited
        .map((place) => nativePlaceName(citySlug, place.slug, place.content.name, locale))
        .join(" · ")}`,
    }).catch(() => onMessage(t.shareFailed));
  }

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <View style={styles.finishCheck}>
          <NativeIcon ios="checkmark" android="check" color={colors.success} size={32} />
        </View>
        <SectionTitle>{title}</SectionTitle>
      </View>

      <MetricSummary
        items={[
          { label: t.timeExplored, value: duration },
          { label: t.distance, value: distance },
          { label: t.placesVisited, value: String(journey.visited.length) },
        ]}
      />

      <View style={styles.feedback}>
        <WalkChoices
          label={translate(locale, "complete.ratingQuestion")}
          compact
          options={[1, 2, 3, 4, 5].map((value) => ({
            value: String(value),
            label: `${value} ★`,
          }))}
          selected={rating}
          onSelect={(value) => {
            setRating([value]);
            void saveFeedback("rating", value);
          }}
        />
        <WalkChoices
          label=""
          multiple
          compact
          options={[
            { value: "route" as const, label: translate(locale, "planner.yourRoute") },
            { value: "places" as const, label: translate(locale, "place.places") },
            { value: "audio" as const, label: translate(locale, "place.audioGuide") },
            { value: "hidden-gems" as const, label: translate(locale, "planner.hiddenGems") },
          ]}
          selected={tags}
          onSelect={toggleTag}
        />
        {feedbackSaving ? <AppText variant="metadata" style={styles.muted}>{translate(locale, "loading.saving")}</AppText> : null}
      </View>

      <PrimaryButton
        wrapLabel
        label={t.share}
        leadingIcon={<NativeIcon ios="square.and.arrow.up" android="share" color={colors.surface} />}
        onPress={share}
      />

      <PublicStoreReview journey={journey} />

      <View style={styles.secondary}>
        {saveFeedback}
        <PrimaryButton
          wrapLabel
          tone="secondary"
          label={saveLabel}
          disabled={saveDisabled}
          busy={saving}
          onPress={onSave}
        />
      </View>

      <View style={styles.highlights}>
        <SectionTitle>{t.highlights}</SectionTitle>
        {visited.length ? (
          <V2Itinerary places={visited} citySlug={citySlug} interactive={false} compact />
        ) : (
          <StatusMessage>{t.noVisited}</StatusMessage>
        )}
      </View>

      <PrimaryButton wrapLabel tone="secondary" label={t.backCity} onPress={onBack} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  hero: { gap: spacing.sm, alignItems: "flex-start" },
  finishCheck: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: colors.successSoft,
  },
  feedback: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  secondary: { gap: spacing.sm },
  highlights: { gap: spacing.sm },
  muted: { color: colors.textMuted },
});
