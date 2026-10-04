import { walkCopy } from "@citywalk/traveler-core/walkCopy";
import { useRef, useState } from "react";
import { Link } from "expo-router";
import { View, type ViewStyle } from "react-native";
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

export function WalkMembershipControl({ citySlug, placeSlug, onlyMember = false, readOnly = false, dense = false, compact = false, inline = false }: { citySlug: string; placeSlug: string; onlyMember?: boolean; readOnly?: boolean; dense?: boolean; compact?: boolean; inline?: boolean }) {
  const { locale, messages } = useNativeLocale(), t = uxCopy(locale);
  const state = useCurrentWalk(citySlug);
  const [busy, setBusy] = useState<"add" | "remove">();
  const lock = useRef(false);
  const [error, setError] = useState("");
  const included = isInWalk(state.current, placeSlug);
  // Discovery cards opt into a content-sized action; Detail and other callers keep their layout.
  const actionStyle: ViewStyle | undefined = dense || inline ? {
    minHeight: compact ? 64 : 44,
    paddingVertical: spacing.sm,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    alignSelf: inline ? "flex-start" : "stretch",
    ...(inline ? { maxWidth: "100%" as const } : {}),
  } : undefined;
  const actionContentStyle: ViewStyle | undefined = inline ? { width: "auto", maxWidth: "100%" } : undefined;
  const actionTone = inline ? "secondary" as const : undefined;
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
    {state.status === "loading" ? <PrimaryButton compact={compact} wrapLabel style={actionStyle} contentStyle={actionContentStyle} tone={actionTone} label={t.checking} busy disabled />
      : state.status === "error" ? <><StatusMessage>{t.failed}</StatusMessage><PrimaryButton compact={compact} wrapLabel style={actionStyle} contentStyle={actionContentStyle} tone={actionTone} label={messages.retry} onPress={() => void state.retry()} /></>
      : included ? <PrimaryButton compact={compact} wrapLabel style={actionStyle} contentStyle={actionContentStyle} label={busy === "remove" ? t.removing : t.remove} leadingIcon={membershipCheck} accessibilityHint={t.included} accessibilityState={{ selected: true }} busy={Boolean(busy)} tone="secondary" onPress={() => void change("remove")} />
      : <PrimaryButton compact={compact} wrapLabel style={actionStyle} contentStyle={actionContentStyle} tone={actionTone} label={busy ? t.adding : t.add} leadingIcon={compact || inline ? <NativeIcon ios="plus" android="add" size={18} color={inline ? colors.primary : "#FFFFFF"} /> : undefined} busy={Boolean(busy)} onPress={() => void change("add")} />}
    {error ? <StatusMessage>{error}</StatusMessage> : null}
    {error === t.budget ? <Link href={{ pathname: "/city/[citySlug]/walk", params: { citySlug } }} asChild><PrimaryButton compact={compact} wrapLabel style={actionStyle} contentStyle={actionContentStyle} tone="secondary" label={walkCopy(locale).customize} /></Link> : null}
  </View>;
}
