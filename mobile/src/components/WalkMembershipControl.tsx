import { walkCopy } from "@citywalk/traveler-core/walkCopy";
import { useRef, useState } from "react";
import { Link } from "expo-router";
import { ActivityIndicator, View, type ViewStyle } from "react-native";
import { useCurrentWalk, refreshCurrentWalk } from "../hooks/useCurrentWalk";
import { prefetchPublicCity } from "../hooks/usePublicContent";
import { publicContentCache, publicContentCacheKey } from "../lib/publicContentCache";
import type { PublicCitySummaryResponse } from "../lib/api/contracts";
import { addPlaceToCurrentWalk, isInWalk, removePlaceFromCurrentWalk } from "../lib/walkMembership";
import { useNativeLocale } from "../localization/LocaleProvider";
import { uxCopy } from "../design/uxCopy";
import { colors, radius, spacing } from "../design/tokens";
import { AppText, PressableSurface, PrimaryButton, StatusMessage } from "./ui";
import { NativeIcon } from "./NativeIcon";

export function WalkMembershipControl({ citySlug, placeSlug, onlyMember = false, readOnly = false, dense = false, compact = false, inline = false, discoveryCard = false, iconOnly = false, onFeedback }: { citySlug: string; placeSlug: string; onlyMember?: boolean; readOnly?: boolean; dense?: boolean; compact?: boolean; inline?: boolean; discoveryCard?: boolean; iconOnly?: boolean; onFeedback?: (message: string, showCustomize: boolean) => void }) {
  const { locale, messages } = useNativeLocale(), t = uxCopy(locale);
  const state = useCurrentWalk(citySlug);
  const [busy, setBusy] = useState<"add" | "remove">();
  const lock = useRef(false);
  const [error, setError] = useState("");
  const included = isInWalk(state.current, placeSlug);
  // Discovery cards opt into a content-sized action; Detail and other callers keep their layout.
  const actionStyle: ViewStyle | undefined = dense || inline ? {
    minHeight: compact && !discoveryCard ? 64 : 44,
    paddingVertical: discoveryCard ? 5 : spacing.sm,
    paddingHorizontal: discoveryCard ? 10 : 12,
    borderRadius: discoveryCard ? 12 : radius.sm,
    alignSelf: inline ? "flex-start" : "stretch",
    ...(inline ? { maxWidth: "100%" as const } : {}),
  } : undefined;
  const actionContentStyle: ViewStyle | undefined = inline ? { width: "auto", maxWidth: "100%" } : undefined;
  const actionTone = inline ? "secondary" as const : undefined;
  const membershipCheck = <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><NativeIcon ios="checkmark" android="check" size={18} color={colors.primary} /></View>;
  async function change(action: "add" | "remove") {
    if (lock.current) return;
    lock.current = true; setBusy(action); setError(""); onFeedback?.("", false);
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
      const budget = failure instanceof Error && /walk-budget|walk-ineligible/.test(failure.message);
      const message = budget ? t.budget : t.failed;
      setError(message);
      onFeedback?.(message, budget);
    } finally { lock.current = false; setBusy(undefined); }
  }
  if (readOnly) return included ? <View accessible accessibilityLabel={t.included} accessibilityLiveRegion="polite">{membershipCheck}</View> : null;
  if (onlyMember && !included && !busy && !error) return null;
  if (iconOnly) return (
    <View style={{ alignItems: "flex-end", gap: 4 }}>
      <PressableSurface
        accessibilityRole="button"
        accessibilityLabel={state.status === "loading" ? t.checking : state.status === "error" ? messages.retry : busy ? t.checking : included ? t.remove : t.add}
        accessibilityState={{ disabled: Boolean(busy || state.status === "loading"), selected: included }}
        disabled={Boolean(busy || state.status === "loading")}
        onPress={() => {
          if (state.status === "error") void state.retry();
          else void change(included ? "remove" : "add");
        }}
        hitSlop={8}
        style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: included ? "#0C8792" : "#D6E5ED", backgroundColor: included ? "#E8F6F4" : colors.surface, alignItems: "center", justifyContent: "center" }}
      >
        {busy || state.status === "loading" ? <ActivityIndicator color={colors.primary} size="small" /> :
          <NativeIcon ios={included ? "checkmark" : state.status === "error" ? "arrow.clockwise" : "plus"} android={included ? "check" : state.status === "error" ? "refresh" : "add"} color={colors.primary} size={22} />}
      </PressableSurface>
      {!onFeedback && error ? <AppText accessibilityLiveRegion="polite" numberOfLines={2} variant="caption" style={{ color: colors.textMuted, width: 150, textAlign: "right" }}>{error}</AppText> : null}
      {!onFeedback && error === t.budget ? <Link href={{ pathname: "/city/[citySlug]/walk", params: { citySlug } }} asChild><PrimaryButton compact tone="secondary" label={walkCopy(locale).customize} style={{ minHeight: 38, paddingHorizontal: 8 }} /></Link> : null}
    </View>
  );
  return <View style={{ gap: discoveryCard ? 5 : spacing.sm, alignSelf: discoveryCard ? "flex-end" : "stretch", maxWidth: "100%" }}>
    {state.status === "loading" ? <PrimaryButton compact={compact} wrapLabel style={actionStyle} contentStyle={actionContentStyle} tone={actionTone} label={t.checking} busy disabled />
      : state.status === "error" ? <><StatusMessage>{t.failed}</StatusMessage><PrimaryButton compact={compact} wrapLabel style={actionStyle} contentStyle={actionContentStyle} tone={actionTone} label={messages.retry} onPress={() => void state.retry()} /></>
      : included ? <PrimaryButton compact={compact} wrapLabel style={actionStyle} contentStyle={actionContentStyle} label={busy === "remove" ? t.removing : t.remove} leadingIcon={membershipCheck} accessibilityHint={t.included} accessibilityState={{ selected: true }} busy={Boolean(busy)} tone="secondary" onPress={() => void change("remove")} />
      : <PrimaryButton compact={compact} wrapLabel style={actionStyle} contentStyle={actionContentStyle} tone={actionTone} label={busy ? t.adding : t.add} leadingIcon={compact || inline ? <NativeIcon ios="plus" android="add" size={18} color={inline ? colors.primary : "#FFFFFF"} /> : undefined} busy={Boolean(busy)} onPress={() => void change("add")} />}
    {error ? discoveryCard ? <AppText accessibilityLiveRegion="polite" numberOfLines={2} variant="caption" style={{ color: colors.textMuted, maxWidth: 220 }}>{error}</AppText> : <StatusMessage>{error}</StatusMessage> : null}
    {error === t.budget ? <Link href={{ pathname: "/city/[citySlug]/walk", params: { citySlug } }} asChild><PrimaryButton compact={compact} wrapLabel style={actionStyle} contentStyle={actionContentStyle} tone="secondary" label={walkCopy(locale).customize} /></Link> : null}
  </View>;
}
