import { t } from "@citywalk/i18n";
import type { WalkJourney } from "@citywalk/traveler-core/walkJourney";
import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { AppState } from "react-native";
import { storeReview } from "../lib/storeReview";
import { useNativeLocale } from "../localization/LocaleProvider";
import { AppText, Card, PrimaryButton } from "./ui";

// Mounted only on Finish. Native review runs after completion, never as a
// response to a private star rating. Only a configured store fallback has a CTA.
export function PublicStoreReview({ journey, onSettled }: { journey: WalkJourney; onSettled?(id: string): void }) {
  const { locale } = useNativeLocale();
  const [fallback, setFallback] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useFocusEffect(useCallback(() => {
    let active = true;
    void storeReview.afterCompletion(journey, () => active && AppState.currentState === "active").then(() => {
      if (active) { setFallback(Boolean(storeReview.configuredUrl())); onSettled?.(journey.id); }
    });
    return () => { active = false; };
  }, [journey, onSettled]));
  if (!fallback) return null;
  return <Card>
    <AppText variant="heading">{t(locale, "review.title")}</AppText>
    <AppText>{t(locale, "review.description")}</AppText>
    <PrimaryButton wrapLabel label={t(locale, "review.action")} busy={busy} onPress={() => {
      if (lock.current) return;
      lock.current = true;
      setBusy(true);
      void storeReview.openFallback().finally(() => {
        setBusy(false);
        setFallback(false);
      });
    }} />
  </Card>;
}
