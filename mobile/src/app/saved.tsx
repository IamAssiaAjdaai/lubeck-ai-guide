import { t as translate } from "@citywalk/i18n";
import { useAccountWalks } from "../hooks/useAccountWalks";
import { removeAccountWalk } from "../lib/accountWalks";
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
  subscribeSavedWalks,
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
  PrimaryButton,
  EmptyState,
  PressableSurface,
  Screen,
  SectionTitle,
} from "../components/ui";

function completedTrips(walks: readonly WalkJourney[], citySlug?: string) {
  const seen = new Set<string>();
  return walks
    .filter((walk) => Boolean(walk.finishedAt) && (!citySlug || walk.citySlug === citySlug))
    .filter((walk) => {
      const key = `${walk.citySlug}:${walk.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => (right.finishedAt ?? 0) - (left.finishedAt ?? 0));
}

export default function SavedScreen() {
  const { citySlug, view } = useLocalSearchParams<{
    citySlug?: string;
    view?: string;
  }>();
  const { locale, direction, messages } = useNativeLocale(),
    t = walkCopy(locale);
  const account = useAccountWalks();
  const [localView, setLocalView] = useState(false);
  const showAccount = Boolean(account.userId) && !localView && view !== "trips";
  const [walks, setWalks] = useState<WalkJourney[]>([]),
    [legacy, setLegacy] = useState<readonly LocalSavedTrip[]>([]),
    [places, setPlaces] = useState<SavedPlace[]>([]);
  const [active, setActive] = useState<WalkJourney[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string>();
  const removeLock = useRef(false);
  const savedRevision = useRef(0);
  const reload = useCallback(async () => {
    const revision = savedRevision.current;
    const [w, l, p] = await Promise.all([
      loadSavedWalks(),
      loadLocalTrips(),
      loadSavedPlaces(),
    ]);
    if (revision === savedRevision.current) setWalks(w);
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
      return subscribeSavedWalks(walks => { savedRevision.current++; setWalks(walks); });
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

  const isTrips = view === "trips";
  const activeTrips = active.filter((walk) => !citySlug || walk.citySlug === citySlug);
  const finishedTrips = completedTrips([...account.walks, ...walks], citySlug);
  const visible = (showAccount ? account.walks : [...walks, ...legacy]).filter(
    (w) => !citySlug || w.citySlug === citySlug,
  );
  const tripDate = (time: number) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(time);
  const tripDuration = (walk: WalkJourney) =>
    t.minutes.replace(
      "{minutes}",
      String(Math.max(0, Math.round(((walk.finishedAt ?? Date.now()) - walk.startedAt) / 60000))),
    );
  const tripDistance = (meters: number) => `${(meters / 1000).toFixed(1)} km`;

  return (
    <Screen>
      <Stack.Screen options={{ title: isTrips ? t.trips : t.saved }} />
      <AppText variant="screenTitle">
        {isTrips ? t.trips : t.saved}
      </AppText>

      {isTrips ? (
        <>
          {error ? <ContentRecovery retry={() => { setError(""); void reload().catch(() => setError(messages.unavailable)); }} /> : null}

          {!activeTrips.length && !finishedTrips.length ? (
            <View style={styles.tripEmpty}>
              <EmptyState
                title={t.emptyTrips}
                description={t.build}
                icon={
                  <NativeIcon
                    ios="suitcase.rolling"
                    android="luggage"
                    color={colors.primary}
                    size={30}
                  />
                }
              />
              <Link
                href={citySlug
                  ? { pathname: "/city/[citySlug]/walk", params: { citySlug } }
                  : "/"}
                asChild
              >
                <PrimaryButton label={t.build} />
              </Link>
            </View>
          ) : null}

          {activeTrips.length ? (
            <View style={styles.tripSection}>
              <SectionTitle>{messages.resumeTrip}</SectionTitle>
              <View style={styles.tripGroup}>
                {activeTrips.map((walk) => {
                  const totalStops = walk.visited.length + walk.remaining.length;
                  return (
                    <View key={`active:${walk.citySlug}:${walk.id}`} style={[styles.tripRow, { direction }]}>
                      <View style={styles.tripIcon}>
                        <NativeIcon ios="figure.walk" android="directions_walk" color={colors.primary} size={20} />
                      </View>
                      <Link
                        href={{ pathname: "/city/[citySlug]/walk", params: { citySlug: walk.citySlug } }}
                        asChild
                      >
                        <PressableSurface accessibilityRole="link" style={styles.tripCopy}>
                          <AppText variant="label">
                            {nativeCityName(walk.citySlug, cityLaunches[walk.citySlug]?.name ?? walk.citySlug, locale)}
                          </AppText>
                          <AppText variant="metadata" style={styles.muted}>
                            {walk.visited.length}/{totalStops} {t.stops} · {t.resume}
                          </AppText>
                        </PressableSurface>
                      </Link>
                      <NativeIcon
                        ios={direction === "rtl" ? "chevron.left" : "chevron.right"}
                        android={direction === "rtl" ? "chevron_left" : "chevron_right"}
                        color={colors.textMuted}
                        size={18}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {finishedTrips.length ? (
            <View style={styles.tripSection}>
              <SectionTitle>{messages.tripComplete}</SectionTitle>
              <View style={styles.tripGroup}>
                {finishedTrips.map((walk) => (
                  <View key={`finished:${walk.citySlug}:${walk.id}`} style={[styles.tripRow, { direction }]}>
                    <View style={[styles.tripIcon, styles.tripCompleteIcon]}>
                      <NativeIcon ios="checkmark" android="check" color={colors.success} size={20} />
                    </View>
                    <View style={styles.tripCopy}>
                      <AppText variant="label">
                        {nativeCityName(walk.citySlug, cityLaunches[walk.citySlug]?.name ?? walk.citySlug, locale)}
                      </AppText>
                      <AppText variant="metadata" style={styles.muted}>
                        {tripDuration(walk)} · {tripDistance(walk.historyDistance)} · {walk.visited.length} {t.stops}
                      </AppText>
                      <AppText variant="caption" style={styles.muted}>
                        {tripDate(walk.finishedAt!)}
                      </AppText>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </>
      ) : (
        <>
          <SectionTitle>{translate(locale, showAccount ? "saved.accountWalks" : "saved.localWalks")}</SectionTitle>
          <AppText variant="metadata">{translate(locale, showAccount ? "saved.accountDescription" : "saved.localDescription")}</AppText>
          {account.userId ? <PrimaryButton tone="secondary" label={translate(locale, showAccount ? "saved.localWalks" : "saved.accountWalks")} onPress={() => setLocalView(value => !value)} /> : <>
            <Link href={{ pathname: "/account", params: { entry: "sign-in" } }} asChild><PrimaryButton label={messages.signIn} tone="secondary" /></Link>
            <Link href={{ pathname: "/account", params: { entry: "sign-up" } }} asChild><PrimaryButton label={messages.signUp} tone="secondary" /></Link>
          </>}
          {showAccount && account.loading ? <CitywalkLoading compact label={uxCopy(locale).saved} /> : null}
          {showAccount && account.error ? <ContentRecovery retry={() => void account.refresh()} /> : null}
          {error ? <ContentRecovery retry={() => { setError(""); void reload().catch(() => setError(messages.unavailable)); }} /> : null}
          {!visible.length && !(showAccount && (account.loading || account.error)) ? (
            <EmptyState
              title={t.emptySaved}
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
                    saved: w.id,
                    ...(showAccount ? { source: "account" } : {}),
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
                    {t.stops} · {t.preview}
                  </AppText>
                </PressableSurface>
              </Link>
              <PressableSurface
                accessibilityRole="button"
                accessibilityLabel={`${t.removeWalk}: ${nativeCityName(w.citySlug, cityLaunches[w.citySlug]?.name ?? w.citySlug, locale)}`}
                style={styles.remove}
                disabled={Boolean(removing)}
                accessibilityState={{ busy: removing === `walk:${w.citySlug}:${w.id}`, disabled: Boolean(removing) }}
                onPress={() =>
                  void remove(`walk:${w.citySlug}:${w.id}`, () =>
                    showAccount && account.userId ? removeAccountWalk(account.userId, w.id) : "remaining" in w
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
            </View>
          ))}
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
      )}
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
  tripEmpty: {
    gap: spacing.md,
  },
  tripSection: {
    gap: spacing.sm,
  },
  tripGroup: {
    overflow: "hidden",
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  tripRow: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tripIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  tripCompleteIcon: {
    backgroundColor: colors.successSoft,
  },
  tripCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    justifyContent: "center",
  },
});