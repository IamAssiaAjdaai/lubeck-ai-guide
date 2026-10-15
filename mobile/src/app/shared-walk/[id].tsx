import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";
import { isEligibleTourPlace } from "@citywalk/traveler-core";

import { AppText, Card, PrimaryButton, Screen, SectionTitle, StatusMessage } from "../../components/ui";
import { CitywalkLoading } from "../../components/CitywalkLoading";
import { colors, spacing } from "../../design/tokens";
import { usePublicCity } from "../../hooks/usePublicContent";
import { useNativeLocale } from "../../localization/LocaleProvider";
import { citywalkApi } from "../../lib/api/instance";
import { createMobileTripId } from "../../lib/tripNavigation";
import { changeCurrentWalk, loadCurrentWalk, type CurrentWalk } from "../../lib/walkStorage";
import { fetchNativeSharedWalk, sharedWalkToNativeJourney, SHARE_ID, type NativeSharedWalk } from "../../lib/sharedWalk";

const copy = {
  en: { title: "A friend shared a walk", subtitle: "Explore the same stops, in the same order. No account needed.",
    start: "Preview this walk", replacing: "Replace current walk?", replace: "Replace and preview",
    keep: "Keep my walk", error: "This shared walk is unavailable or no longer matches published places.",
    retry: "Try again", loading: "Checking shared walk…", busy: "Opening walk…", stops: "stops" },
  de: { title: "Jemand hat eine Tour geteilt", subtitle: "Dieselben Stopps, in derselben Reihenfolge. Kein Konto nötig.",
    start: "Tour ansehen", replacing: "Aktuelle Tour ersetzen?", replace: "Ersetzen und ansehen",
    keep: "Meine Tour behalten", error: "Diese Tour ist nicht mehr verfügbar oder wurde geändert.",
    retry: "Erneut versuchen", loading: "Tour wird geprüft…", busy: "Tour wird geöffnet…", stops: "Stopps" },
  fr: { title: "Une balade partagée", subtitle: "Les mêmes arrêts, dans le même ordre. Aucun compte requis.",
    start: "Voir la balade", replacing: "Remplacer la balade actuelle ?", replace: "Remplacer et voir",
    keep: "Garder ma balade", error: "Cette balade n'est plus disponible ou a changé.",
    retry: "Réessayer", loading: "Vérification de la balade…", busy: "Ouverture…", stops: "étapes" },
  ar: { title: "جولة شاركها معك صديق", subtitle: "نفس المحطات وبنفس الترتيب. بلا حساب.",
    start: "شوف الجولة", replacing: "واش تبغي تبدّل الجولة الحالية؟", replace: "بدّل وشوف الجولة",
    keep: "خلّي جولتي الحالية", error: "هاد الجولة ما بقاتش متاحة أو تبدلات المحطات.",
    retry: "عاود المحاولة", loading: "كنتحققو من الجولة…", busy: "كنفتحو الجولة…", stops: "محطات" },
} as const;

type SharedLoad =
  | { status: "loading"; id: string }
  | { status: "error"; id: string }
  | { status: "ready"; id: string; shared: NativeSharedWalk };

export default function NativeSharedWalkScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = typeof params.id === "string" && SHARE_ID.test(params.id) ? params.id : "";
  const [reload, setReload] = useState(0);
  const [load, setLoad] = useState<SharedLoad>({ status: "loading", id });

  useEffect(() => {
    if (!id) {
      setLoad({ status: "error", id: "" });
      return;
    }
    const controller = new AbortController();
    setLoad({ status: "loading", id });
    void fetchNativeSharedWalk(id, citywalkApi.origin, fetch, controller.signal)
      .then(shared => { if (!controller.signal.aborted) setLoad({ status: "ready", id, shared }); })
      .catch(() => { if (!controller.signal.aborted) setLoad({ status: "error", id }); });
    return () => controller.abort();
  }, [id, reload]);

  const { locale } = useNativeLocale();
  const t = copy[locale as keyof typeof copy] ?? copy.en;
  if (load.status === "loading" || load.id !== id)
    return <Screen navigation={false}><CitywalkLoading variant="city" label={t.loading} /></Screen>;
  if (load.status === "error")
    return <Screen navigation={false}>
      <StatusMessage tone="error">{t.error}</StatusMessage>
      <PrimaryButton label={t.retry} onPress={() => setReload(n => n + 1)} />
    </Screen>;
  return <NativeSharedPreview key={id} id={id} shared={load.shared} />;
}

function NativeSharedPreview({ id, shared }: { id: string; shared: NativeSharedWalk }) {
  const { locale } = useNativeLocale();
  const t = copy[locale as keyof typeof copy] ?? copy.en;
  const router = useRouter();
  const city = usePublicCity(shared.route.citySlug, locale);
  const [busy, setBusy] = useState(false);
  const [replace, setReplace] = useState<CurrentWalk>();
  const [error, setError] = useState(false);
  const validCity = city.status === "available" && city.data.city.slug === shared.route.citySlug;
  const places = validCity ? city.data.places : [];
  const preview = validCity && sharedWalkToNativeJourney(shared, places, "preview");
  const bySlug = new Map(places.filter(isEligibleTourPlace).map(place => [place.slug, place]));
  const stops = shared.route.stopSlugs.map(slug => bySlug.get(slug));
  const available = Boolean(preview) && stops.every(Boolean);

  const commit = async (expected: CurrentWalk | undefined) => {
    if (!validCity || !available) return;
    setBusy(true);
    setError(false);
    try {
      // A sender can revoke/edit a link after it was opened. Re-fetch before
      // touching native storage; never restore a stale or partially missing route.
      const fresh = await fetchNativeSharedWalk(id, citywalkApi.origin);
      if (JSON.stringify(fresh.route) !== JSON.stringify(shared.route)) throw new Error("share-changed");
      const journey = sharedWalkToNativeJourney(fresh, places, createMobileTripId("walk"));
      if (!journey) throw new Error("unpublished-stops");
      await changeCurrentWalk(journey.citySlug, current => {
        if (JSON.stringify(current ?? null) !== JSON.stringify(expected ?? null)) {
          throw new Error("walk-changed-since-confirmation");
        }
        return { phase: "preview", journey };
      });
      router.replace({ pathname: "/city/[citySlug]/walk", params: { citySlug: journey.citySlug } });
    } catch {
      setError(true);
      setReplace(undefined);
    } finally {
      setBusy(false);
    }
  };

  const begin = async () => {
    if (busy || !available) return;
    setBusy(true);
    try {
      const current = await loadCurrentWalk(shared.route.citySlug);
      if (current) setReplace(current);
      else await commit(undefined);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return <Screen navigation={false}>
    <AppText variant="caption" style={{ color: colors.primary }}>CITYWALK · SHARED WALK</AppText>
    <SectionTitle>{t.title}</SectionTitle>
    <AppText>{t.subtitle}</AppText>
    {city.status === "loading" ? <CitywalkLoading variant="city" /> : null}
    {city.status === "error" ? <StatusMessage tone="error">{t.error}</StatusMessage> : null}
    {validCity ? <>
      <AppText variant="heading">{city.data.city.content.name} · {stops.length} {t.stops}</AppText>
      <AppText>{shared.route.settings.minutes} min</AppText>
      {available ? stops.map((stop, i) => <Card key={stop!.slug}>
        <View style={{ gap: spacing.xs }}>
          <AppText variant="label">{i + 1}. {stop!.content.name}</AppText>
          <AppText variant="caption">{stop!.content.shortDescription}</AppText>
        </View>
      </Card>) : <StatusMessage tone="error">{t.error}</StatusMessage>}
      <PrimaryButton label={busy ? t.busy : t.start} busy={busy}
        disabled={!available || Boolean(replace)} onPress={() => void begin()} />
      {replace ? <Card>
        <AppText variant="heading">{t.replacing}</AppText>
        <PrimaryButton label={t.replace} busy={busy} onPress={() => void commit(replace)} />
        <PrimaryButton label={t.keep} tone="secondary" onPress={() => setReplace(undefined)} />
      </Card> : null}
    </> : null}
    {error ? <StatusMessage tone="error">{t.error}</StatusMessage> : null}
  </Screen>;
}
