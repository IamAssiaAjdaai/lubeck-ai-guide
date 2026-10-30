import { useCallback, useRef, useState, type ReactNode } from "react";
import { Link, useFocusEffect, useRouter } from "expo-router";
import { View } from "react-native";
import { curatedResumeIndex, type CuratedProgress } from "@citywalk/traveler-core";
import { walkCopy } from "@citywalk/traveler-core/walkCopy";
import { loadCuratedProgress, openCuratedProgress, updateCuratedProgress } from "../lib/curatedProgressStorage";
import { createMobileTripPlaceParams, type MobileTripContext } from "../lib/tripNavigation";
import { useNativeLocale } from "../localization/LocaleProvider";
import { AppText, PrimaryButton } from "./ui";
import { NativeIcon } from "./NativeIcon";

export function CuratedTourControls({ citySlug, tourSlug, stopSlugs, trip, renderStart }: {
  citySlug: string; tourSlug: string; stopSlugs: readonly string[]; trip?: MobileTripContext;
  renderStart?: (controls: { busy: boolean; disabled: boolean; onPress: () => void }) => ReactNode;
}) {
  const router = useRouter();
  const { locale, messages } = useNativeLocale();
  const t = walkCopy(locale);
  const [progress, setProgress] = useState<CuratedProgress>();
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const requestVersion = useRef(0);
  const signature = JSON.stringify(stopSlugs);
  const reloadProgress = useCallback(async () => {
    const version = ++requestVersion.current;
    setBusy(true); setError(false);
    try {
      const value = await loadCuratedProgress(citySlug, tourSlug);
      if (version !== requestVersion.current) return;
      if (value && JSON.stringify(value.stopSlugs) !== signature) { setError(true); setProgress(undefined); }
      else setProgress(value);
    } catch {
      if (version === requestVersion.current) { setError(true); setProgress(undefined); }
    } finally {
      if (version === requestVersion.current) setBusy(false);
    }
  }, [citySlug, tourSlug, signature]);
  useFocusEffect(useCallback(() => {
    void reloadProgress();
    return () => { requestVersion.current += 1; };
  }, [reloadProgress]));
  function navigate(value: CuratedProgress, replace = true) {
    const pending = curatedResumeIndex(value);
    const destination = { pathname: "/city/[citySlug]/place/[placeSlug]", params: createMobileTripPlaceParams({
      id: `published-${tourSlug}`, citySlug, stopSlugs: value.stopSlugs, source: "published",
    }, pending < 0 ? value.stopSlugs.length - 1 : pending) } as const;
    if (replace) router.replace(destination); else router.push(destination);
  }
  async function start() {
    if (busy || error) return;
    setBusy(true);
    try { const value = await openCuratedProgress(citySlug, tourSlug, stopSlugs); setProgress(value); navigate(value, false); }
    catch { setError(true); } finally { setBusy(false); }
  }
  async function mark(status: "visited" | "skipped") {
    if (busy || error || !progress || !trip || trip.currentStopIndex !== curatedResumeIndex(progress)) return;
    setBusy(true); setError(false);
    try { const next = await updateCuratedProgress(progress, trip.currentStopIndex, status); setProgress(next); if (curatedResumeIndex(next) >= 0) navigate(next); }
    catch { setError(true); } finally { setBusy(false); }
  }
  const completed = progress && curatedResumeIndex(progress) < 0;
  return <View style={{ gap: 12 }}>
    {error ? <>
      <AppText accessibilityRole="alert">{messages.tripSaveFailed}</AppText>
      <PrimaryButton disabled={busy} label={messages.retry} onPress={() => void reloadProgress()} />
    </> : null}
    {!trip ? renderStart ? renderStart({ busy, disabled: busy || error, onPress: () => void start() }) : <PrimaryButton haptic="medium" leadingIcon={<NativeIcon ios="figure.walk" android="directions_walk" color="#FFFFFF" size={20} />} busy={busy} disabled={busy || error} label={completed ? messages.tripComplete : progress ? t.continue : messages.startTour} onPress={() => void start()} /> : progress ? <>
      <AppText>{completed ? messages.tripComplete : `${progress.statuses.filter(s => s === "visited").length} / ${stopSlugs.length} ${t.visited}`}</AppText>
      {!completed && trip.currentStopIndex !== curatedResumeIndex(progress) ? <PrimaryButton disabled={busy || error} label={t.continue} onPress={() => navigate(progress)} /> : !completed ? <>
        <PrimaryButton busy={busy} disabled={busy || error} label={t.visited} onPress={() => void mark("visited")} />
        <PrimaryButton busy={busy} disabled={busy || error} tone="secondary" label={t.skip} onPress={() => void mark("skipped")} />
      </> : null}
    </> : <Link href={{ pathname: "/city/[citySlug]/tour/[tourSlug]", params: { citySlug, tourSlug } }} asChild><PrimaryButton disabled={busy || error} busy={busy} label={messages.startTour} /></Link>}
  </View>;
}
