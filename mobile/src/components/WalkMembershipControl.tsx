import { walkCopy } from "@citywalk/traveler-core/walkCopy";
import { useRef, useState } from "react";
import { Link } from "expo-router";
import { View } from "react-native";
import { useCurrentWalk, refreshCurrentWalk } from "../hooks/useCurrentWalk";
import { prefetchPublicCity } from "../hooks/usePublicContent";
import { publicContentCache, publicContentCacheKey } from "../lib/publicContentCache";
import type { PublicCitySummaryResponse } from "../lib/api/contracts";
import { addPlaceToCurrentWalk, isInWalk, removePlaceFromCurrentWalk } from "../lib/walkMembership";
import { useNativeLocale } from "../localization/LocaleProvider";
import { uxCopy } from "../design/uxCopy";
import { colors, radius, spacing } from "../design/tokens";
import { PrimaryButton, StatusMessage } from "./ui";
import { NativeIcon } from "./NativeIcon";

export function WalkMembershipControl({ citySlug, placeSlug, onlyMember = false, readOnly = false, dense = false }: { citySlug: string; placeSlug: string; onlyMember?: boolean; readOnly?: boolean; dense?: boolean }) {
  const { locale, messages } = useNativeLocale(), t = uxCopy(locale);
  const state = useCurrentWalk(citySlug);
  const [busy, setBusy] = useState<"add" | "remove">();
  const lock = useRef(false);
  const [error, setError] = useState("");
  const included = isInWalk(state.current, placeSlug);
  const actionStyle = dense ? { minHeight: 44, paddingVertical: spacing.sm, paddingHorizontal: 12, borderRadius: radius.sm, alignSelf: "stretch" as const } : undefined;
  const membershipCheck = <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><NativeIcon ios="checkmark" android="check" size={18} color={colors.primary} /></View>;
  async function change(action: "add" | "remove") {
    if (lock.current) return;
    lock.current = true; setBusy(action); setError("");
    try {
      if (action === "remove") await removePlaceFromCurrentWalk(citySlug, placeSlug);
      else {
        await prefetchPublicCity(citySlug, locale);
        const data = publicContentCache.peek<PublicCitySummaryResponse>(publicContentCacheKey("city", locale, citySlug));
        if (!data || data.city.slug !== citySlug) throw new Error("walk-content-unavailable");
        await addPlaceToCurrentWalk(citySlug, placeSlug, data.places);
      }
      await refreshCurrentWalk(citySlug);
    } catch (failure) {
      setError(failure instanceof Error && /walk-budget|walk-ineligible/.test(failure.message) ? t.budget : t.failed);
    } finally { lock.current = false; setBusy(undefined); }
  }
  if (readOnly) return included ? <View accessible accessibilityLabel={t.included} accessibilityLiveRegion="polite">{membershipCheck}</View> : null;
  if (onlyMember && !included && !busy && !error) return null;
  return <View style={{ gap: spacing.sm, alignSelf: "stretch" }}>
    {state.status === "loading" ? <PrimaryButton wrapLabel style={actionStyle} label={t.checking} busy disabled />
      : state.status === "error" ? <><StatusMessage>{t.failed}</StatusMessage><PrimaryButton wrapLabel style={actionStyle} label={messages.retry} onPress={() => void state.retry()} /></>
      : included ? <PrimaryButton wrapLabel style={actionStyle} label={busy === "remove" ? t.removing : t.remove} leadingIcon={membershipCheck} accessibilityHint={t.included} accessibilityState={{ selected: true }} busy={Boolean(busy)} tone="secondary" onPress={() => void change("remove")} />
      : <PrimaryButton wrapLabel style={actionStyle} label={busy ? t.adding : t.add} busy={Boolean(busy)} onPress={() => void change("add")} />}
    {error ? <StatusMessage>{error}</StatusMessage> : null}
    {error === t.budget ? <Link href={{ pathname: "/city/[citySlug]/walk", params: { citySlug } }} asChild><PrimaryButton wrapLabel style={actionStyle} tone="secondary" label={walkCopy(locale).customize} /></Link> : null}
  </View>;
}
