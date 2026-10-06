import { t as translate } from "@citywalk/i18n";
import { useAccountWalks } from "../hooks/useAccountWalks";
import { removeAccountWalk } from "../lib/accountWalks";
import { CitywalkLoading } from "../components/CitywalkLoading";
import { uxCopy } from "../design/uxCopy";
import { ContentRecovery } from "../components/ContentRecovery";
import { nativeCityName, nativePlaceName } from "../lib/displayNames";
import { cityLaunches } from "@citywalk/traveler-core/cityAvailability";
import { NativeIcon } from "../components/NativeIcon";
import { colors, radius, spacing } from "../design/tokens";
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
  const visibleWalks = (showAccount ? account.walks : [...walks, ...legacy]).filter(
    (walk) => !citySlug || walk.citySlug === citySlug,
  );
  const visiblePlaces = places.filter((place) => !citySlug || place.citySlug === citySlug);
  const tripDate = (time: number) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(time);
  const tripDuration = (walk: WalkJourney) =>
    t.minutes.replace(
      "{minutes}",
      String(Math.max(0, Math.round((walk.finishedAt! - walk.startedAt) / 60000))),
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
          {account.userId ? (
            <View style={[styles.sourceRow, { direction }]}>
              <View style={styles.sourceCopy}>
                <AppText variant="label">
                  {translate(locale, showAccount ? "saved.accountWalks" : "saved.localWalks")}
                </AppText>
                <AppText variant="metadata" style={styles.muted}>
                  {translate(locale, showAccount ? "saved.accountDescription" : "saved.localDescription")}
                </AppText>
              </View>
              <PressableSurface
                accessibilityRole="button"
                style={styles.sourceAction}
                onPress={() => setLocalView((value) => !value)}
              >
                <AppText variant="metadata" style={styles.savedActionText}>
                  {translate(locale, showAccount ? "saved.localWalks" : "saved.accountWalks")}
                </AppText>
              </PressableSurface>
            </View>
          ) : (
            <View style={styles.syncPrompt}>
              <View style={styles.sourceCopy}>
                <AppText variant="label">{translate(locale, "saved.localWalks")}</AppText>
                <AppText variant="metadata" style={styles.muted}>
                  {translate(locale, "saved.localDescription")}
                </AppText>
              </View>
              <Link href={{ pathname: "/account", params: { entry: "sign-in" } }} asChild>
                <PrimaryButton label={messages.signIn} tone="secondary" />
              </Link>
            </View>
          )}

          {showAccount && account.loading ? <CitywalkLoading compact label={uxCopy(locale).saved} /> : null}
          {showAccount && account.error ? <ContentRecovery retry={() => void account.refresh()} /> : null}
          {error ? <ContentRecovery retry={() => { setError(""); void reload().catch(() => setError(messages.unavailable)); }} /> : null}

          <View style={styles.savedSection}>
            <SectionTitle>{t.places}</SectionTitle>
            {visiblePlaces.length ? (
              <View style={styles.savedGroup}>
                {visiblePlaces.map((place) => (
                  <View key={`${place.citySlug}:${place.slug}`} style={[styles.savedRow, { direction }]}>
                    <View style={styles.savedIcon}>
                      <NativeIcon ios="heart.fill" android="favorite" color={colors.primary} size={19} />
                    </View>
                    <Link
                      href={{
                        pathname: "/city/[citySlug]/place/[placeSlug]",
                        params: { citySlug: place.citySlug, placeSlug: place.slug },
                      }}
                      asChild
                    >
                      <PressableSurface accessibilityRole="link" style={styles.savedCopy}>
                        <AppText variant="label">
                          {nativePlaceName(place.citySlug, place.slug, place.name, locale)}
                        </AppText>
                        <AppText variant="metadata" style={styles.muted}>
                          {nativeCityName(place.citySlug, cityLaunches[place.citySlug]?.name ?? place.citySlug, locale)}
                        </AppText>
                      </PressableSurface>
                    </Link>
                    <PressableSurface
                      accessibilityRole="button"
                      accessibilityLabel={`${t.removePlace}: ${nativePlaceName(place.citySlug, place.slug, place.name, locale)}`}
                      style={styles.remove}
                      disabled={Boolean(removing)}
                      accessibilityState={{ busy: removing === `place:${place.citySlug}:${place.slug}`, disabled: Boolean(removing) }}
                      onPress={() => void remove(`place:${place.citySlug}:${place.slug}`, () => toggleSavedPlace(place))}
                    >
                      {removing === `place:${place.citySlug}:${place.slug}` ? (
                        <ActivityIndicator color={colors.primary} />
                      ) : (
                        <NativeIcon ios="trash" android="delete_outline" size={19} color={colors.textMuted} />
                      )}
                    </PressableSurface>
                  </View>
                ))}
              </View>
            ) : (
              <View style={[styles.savedEmptyRow, { direction }]}>
                <View style={styles.savedEmptyIcon}>
                  <NativeIcon ios="heart" android="favorite_border" color={colors.primary} size={20} />
                </View>
                <View style={styles.savedEmptyCopy}>
                  <AppText variant="label">{t.savedPlacesEmpty}</AppText>
                  <AppText variant="metadata" style={styles.muted}>
                    {translate(locale, "emptyStates.savedPlaces")}
                  </AppText>
                  <Link
                    href={citySlug
                      ? { pathname: "/city/[citySlug]/explore", params: { citySlug } }
                      : "/"}
                    asChild
                  >
                    <PressableSurface accessibilityRole="link" style={styles.savedInlineAction}>
                      <AppText variant="metadata" style={styles.savedActionText}>
                        {translate(locale, "cityHub.places")}
                      </AppText>
                    </PressableSurface>
                  </Link>
                </View>
              </View>
            )}
          </View>

          <View style={styles.savedSection}>
            <SectionTitle>{translate(locale, "saved.trips")}</SectionTitle>
            {!visibleWalks.length && !(showAccount && (account.loading || account.error)) ? (
              <View style={[styles.savedEmptyRow, { direction }]}>
                <View style={styles.savedEmptyIcon}>
                  <NativeIcon ios="bookmark" android="bookmark_border" color={colors.primary} size={20} />
                </View>
                <View style={styles.savedEmptyCopy}>
                  <AppText variant="label">{t.emptySaved}</AppText>
                  <AppText variant="metadata" style={styles.muted}>
                    {translate(locale, "emptyStates.savedWalks")}
                  </AppText>
                </View>
              </View>
            ) : null}
            {visibleWalks.length ? (
              <View style={styles.savedGroup}>
                {visibleWalks.map((walk) => (
                  <View key={`${walk.citySlug}:${walk.id}`} style={[styles.savedRow, { direction }]}>
                    <View style={styles.savedIcon}>
                      <NativeIcon ios="bookmark.fill" android="bookmark" color={colors.primary} size={19} />
                    </View>
                    <Link
                      href={{
                        pathname: "/city/[citySlug]/walk",
                        params: {
                          citySlug: walk.citySlug,
                          saved: walk.id,
                          ...(showAccount ? { source: "account" } : {}),
                        },
                      }}
                      asChild
                    >
                      <PressableSurface accessibilityRole="link" style={styles.savedCopy}>
                        <AppText variant="label">
                          {nativeCityName(walk.citySlug, cityLaunches[walk.citySlug]?.name ?? walk.citySlug, locale)}
                        </AppText>
                        <AppText variant="metadata" style={styles.muted}>
                          {("remaining" in walk
                            ? [...walk.visited, ...walk.remaining]
                            : walk.stopSlugs
                          ).length}{" "}
                          {t.stops} · {t.preview}
                        </AppText>
                      </PressableSurface>
                    </Link>
                    <PressableSurface
                      accessibilityRole="button"
                      accessibilityLabel={`${t.removeWalk}: ${nativeCityName(walk.citySlug, cityLaunches[walk.citySlug]?.name ?? walk.citySlug, locale)}`}
                      style={styles.remove}
                      disabled={Boolean(removing)}
                      accessibilityState={{ busy: removing === `walk:${walk.citySlug}:${walk.id}`, disabled: Boolean(removing) }}
                      onPress={() =>
                        void remove(`walk:${walk.citySlug}:${walk.id}`, () =>
                          showAccount && account.userId
                            ? removeAccountWalk(account.userId, walk.id)
                            : "remaining" in walk
                              ? removeNativeWalk(walk.citySlug, walk.id)
                              : removeLocalTrip(walk.citySlug, walk.id),
                        )
                      }
                    >
                      {removing === `walk:${walk.citySlug}:${walk.id}` ? (
                        <ActivityIndicator color={colors.primary} />
                      ) : (
                        <NativeIcon ios="trash" android="delete_outline" color={colors.textMuted} size={19} />
                      )}
                    </PressableSurface>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textMuted },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  sourceCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  sourceAction: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  syncPrompt: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  savedSection: {
    gap: spacing.sm,
  },
  savedGroup: {
    overflow: "hidden",
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  savedRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  savedIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  savedCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    justifyContent: "center",
  },
  savedEmptyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  savedEmptyIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  savedEmptyCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  savedInlineAction: {
    minHeight: 34,
    alignSelf: "flex-start",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  savedActionText: {
    color: colors.primary,
  },
  remove: {
    width: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
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