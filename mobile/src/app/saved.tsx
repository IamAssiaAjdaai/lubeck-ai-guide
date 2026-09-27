import { CitywalkLoading } from "../components/CitywalkLoading";
import { uxCopy } from "../design/uxCopy";
import { ContentRecovery } from "../components/ContentRecovery";
import { WalkMembershipControl } from "../components/WalkMembershipControl";
import { nativeCityName, nativePlaceName } from "../lib/displayNames";
import { cityLaunches } from "@citywalk/traveler-core/cityAvailability";
import { NativeIcon } from "../components/NativeIcon";
import { colors, radius, shadows, spacing } from "../design/tokens";
import { useCallback, useRef, useState } from "react";
import { Link, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { walkCopy } from "@citywalk/traveler-core/walkCopy";
import type { WalkJourney } from "@citywalk/traveler-core/walkJourney";
import {
  loadActiveWalk,
  loadSavedPlaces,
  loadSavedWalks,
  removeNativeWalk,
  toggleSavedPlace,
  type SavedPlace,
} from "../lib/walkStorage";
import {
  loadLocalTrips,
  removeLocalTrip,
  type LocalSavedTrip,
} from "../lib/tripStorage";
import { useNativeLocale } from "../localization/LocaleProvider";
import {
  AppText,
  EmptyState,
  PressableSurface,
  Screen,
  SectionTitle,
} from "../components/ui";
export default function SavedScreen() {
  const { citySlug, view } = useLocalSearchParams<{
    citySlug?: string;
    view?: string;
  }>();
  const { locale, direction, messages } = useNativeLocale(),
    t = walkCopy(locale);
  const [walks, setWalks] = useState<WalkJourney[]>([]),
    [legacy, setLegacy] = useState<readonly LocalSavedTrip[]>([]),
    [places, setPlaces] = useState<SavedPlace[]>([]);
  const [active, setActive] = useState<WalkJourney[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string>();
  const removeLock = useRef(false);
  const reload = useCallback(async () => {
    const [w, l, p] = await Promise.all([
      loadSavedWalks(),
      loadLocalTrips(),
      loadSavedPlaces(),
    ]);
    setWalks(w);
    setLegacy(l);
    setPlaces(p);
    const citySlugs = [
      ...new Set([
        ...Object.keys(cityLaunches).filter(
          (slug) => cityLaunches[slug].status === "available",
        ),
        ...w.map((item) => item.citySlug),
        ...l.map((item) => item.citySlug),
      ]),
    ];
    const journeys = await Promise.all(
      citySlugs.map((slug) => loadActiveWalk(slug)),
    );
    setActive(journeys.filter((item): item is WalkJourney => Boolean(item)));
    setLoading(false);
  }, []);
  useFocusEffect(
    useCallback(() => {
      void reload().catch(() => { setLoading(false); setError(messages.unavailable); });
    }, [reload, messages.unavailable]),
  );
  async function remove(key: string, work: () => Promise<unknown>) {
    if (removeLock.current) return;
    removeLock.current = true; setRemoving(key);
    try {
      await work();
      await reload();
      setError("");
    } catch {
      setError(t.removeFailed);
    } finally { removeLock.current = false; setRemoving(undefined); }
  }
  if (loading) return <Screen><CitywalkLoading compact label={uxCopy(locale).saved} /></Screen>;
  const visible = (view === "trips" ? active : [...walks, ...legacy]).filter(
    (w) => !citySlug || w.citySlug === citySlug,
  );
  return (
    <Screen>
      <Stack.Screen options={{ title: view === "trips" ? t.trips : t.saved }} />
      <AppText variant="screenTitle">
        {view === "trips" ? t.trips : t.saved}
      </AppText>
      {error ? <ContentRecovery retry={() => { setError(""); void reload().catch(() => setError(messages.unavailable)); }} /> : null}
      {!visible.length ? (
        <EmptyState
          title={view === "trips" ? t.emptyTrips : t.emptySaved}
          description={t.build}
          icon={
            <NativeIcon
              ios="bookmark"
              android="bookmark_border"
              color={colors.primary}
              size={30}
            />
          }
        />
      ) : null}
      {visible.map((w) => (
        <View key={`${w.citySlug}:${w.id}`} style={[styles.row, { direction }]}>
          <View style={styles.icon}>
            <NativeIcon
              ios="bookmark"
              android="bookmark_border"
              color={colors.primary}
            />
          </View>
          <Link
            href={{
              pathname: "/city/[citySlug]/walk",
              params: {
                citySlug: w.citySlug,
                ...(view === "trips" ? {} : { saved: w.id }),
              },
            }}
            asChild
          >
            <PressableSurface accessibilityRole="link" style={styles.copy}>
              <AppText variant="label">
                {nativeCityName(w.citySlug, cityLaunches[w.citySlug]?.name ?? w.citySlug, locale)}
              </AppText>
              <AppText variant="metadata" style={styles.muted}>
                {
                  ("remaining" in w
                    ? [...w.visited, ...w.remaining]
                    : w.stopSlugs
                  ).length
                }{" "}
                {t.stops} · {view === "trips" ? t.resume : t.preview}
              </AppText>
            </PressableSurface>
          </Link>
          {view !== "trips" ? (
            <PressableSurface
              accessibilityRole="button"
              accessibilityLabel={`${t.removeWalk}: ${nativeCityName(w.citySlug, cityLaunches[w.citySlug]?.name ?? w.citySlug, locale)}`}
              style={styles.remove}
              disabled={Boolean(removing)}
              accessibilityState={{ busy: removing === `walk:${w.citySlug}:${w.id}`, disabled: Boolean(removing) }}
              onPress={() =>
                void remove(`walk:${w.citySlug}:${w.id}`, () =>
                  "remaining" in w
                    ? removeNativeWalk(w.citySlug, w.id)
                    : removeLocalTrip(w.citySlug, w.id),
                )
              }
            >
              {removing === `walk:${w.citySlug}:${w.id}` ? <ActivityIndicator color={colors.primary} /> : <NativeIcon
                ios="trash"
                android="delete_outline"
                color={colors.textMuted}
                size={20}
              />}
            </PressableSurface>
          ) : null}
        </View>
      ))}
      {view !== "trips" ? (
        <>
          <SectionTitle>{t.places}</SectionTitle>
          {!places.filter((p) => !citySlug || p.citySlug === citySlug)
            .length ? (
            <EmptyState
              title={t.savedPlacesEmpty}
              description={t.places}
              icon={
                <NativeIcon
                  ios="heart"
                  android="favorite_border"
                  color={colors.primary}
                />
              }
            />
          ) : null}
          {places
            .filter((p) => !citySlug || p.citySlug === citySlug)
            .map((p) => (
              <View key={`${p.citySlug}:${p.slug}`} style={[styles.row, { direction }]}>
                <View style={styles.icon}>
                  <NativeIcon
                    ios="mappin"
                    android="place"
                    color={colors.primary}
                  />
                </View>
                <Link
                  href={{
                    pathname: "/city/[citySlug]/place/[placeSlug]",
                    params: { citySlug: p.citySlug, placeSlug: p.slug },
                  }}
                  asChild
                >
                  <PressableSurface
                    accessibilityRole="link"
                    style={styles.copy}
                  >
                    <AppText variant="label">{nativePlaceName(p.citySlug, p.slug, p.name, locale)}</AppText>
                    <WalkMembershipControl citySlug={p.citySlug} placeSlug={p.slug} readOnly />
                  </PressableSurface>
                </Link>
                <PressableSurface
                  accessibilityRole="button"
                  accessibilityLabel={`${t.removePlace}: ${nativePlaceName(p.citySlug, p.slug, p.name, locale)}`}
                  style={styles.remove}
                  disabled={Boolean(removing)}
                  accessibilityState={{ busy: removing === `place:${p.citySlug}:${p.slug}`, disabled: Boolean(removing) }}
                  onPress={() => void remove(`place:${p.citySlug}:${p.slug}`, () => toggleSavedPlace(p))}
                >
                  {removing === `place:${p.citySlug}:${p.slug}` ? <ActivityIndicator color={colors.primary} /> : <NativeIcon
                    ios="trash"
                    android="delete_outline"
                    size={20}
                    color={colors.textMuted}
                  />}
                </PressableSurface>
              </View>
            ))}
        </>
      ) : null}
    </Screen>
  );
}
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 100,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  icon: {
    width: 48,
    height: 48,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, minWidth: 0, gap: spacing.xs, justifyContent: "center" },
  remove: { width: 44, alignItems: "center", justifyContent: "center" },
  muted: { color: colors.textMuted },
});
