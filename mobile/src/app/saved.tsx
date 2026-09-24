import { useCallback, useState } from "react";
import { Link, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { walkCopy } from "@citywalk/traveler-core/walkCopy";
import type { WalkJourney } from "@citywalk/traveler-core/walkJourney";
import {
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
  PrimaryButton,
  Screen,
  SectionTitle,
  StatusMessage,
} from "../components/ui";
export default function SavedScreen() {
  const { citySlug } = useLocalSearchParams<{ citySlug?: string }>();
  const { locale, messages } = useNativeLocale(),
    t = walkCopy(locale);
  const [walks, setWalks] = useState<WalkJourney[]>([]),
    [legacy, setLegacy] = useState<readonly LocalSavedTrip[]>([]),
    [places, setPlaces] = useState<SavedPlace[]>([]);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    const [w, l, p] = await Promise.all([
      loadSavedWalks(),
      loadLocalTrips(),
      loadSavedPlaces(),
    ]);
    setWalks(w);
    setLegacy(l);
    setPlaces(p);
  }, []);
  useFocusEffect(
    useCallback(() => {
      void reload().catch(() => setError(messages.unavailable));
    }, [reload, messages.unavailable]),
  );
  async function remove(work: () => Promise<unknown>) {
    try {
      await work();
      await reload();
      setError("");
    } catch {
      setError(t.removeFailed);
    }
  }
  const visible = [...walks, ...legacy].filter(
    (w) => !citySlug || w.citySlug === citySlug,
  );
  return (
    <Screen>
      <Stack.Screen options={{ title: t.saved }} />
      <SectionTitle>{t.saved}</SectionTitle>
      {error ? <StatusMessage>{error}</StatusMessage> : null}
      {!visible.length ? <AppText>{t.emptySaved}</AppText> : null}
      {visible.map((w) => (
        <View key={`${w.citySlug}:${w.id}`} style={{ gap: 8 }}>
          <AppText variant="heading">
            {w.citySlug} ·{" "}
            {
              ("remaining" in w ? [...w.visited, ...w.remaining] : w.stopSlugs)
                .length
            }{" "}
            {t.stops}
          </AppText>
          <Link
            href={{
              pathname: "/city/[citySlug]/walk",
              params: { citySlug: w.citySlug, saved: w.id },
            }}
            asChild
          >
            <PrimaryButton wrapLabel label={t.preview} />
          </Link>
          <PrimaryButton
            wrapLabel
            tone="secondary"
            label={t.removeWalk}
            onPress={() =>
              void remove(() =>
                "remaining" in w
                  ? removeNativeWalk(w.citySlug, w.id)
                  : removeLocalTrip(w.citySlug, w.id),
              )
            }
          />
        </View>
      ))}
      <SectionTitle>{t.places}</SectionTitle>
      {!places.filter((p) => !citySlug || p.citySlug === citySlug).length ? (
        <AppText>{t.savedPlacesEmpty}</AppText>
      ) : null}
      {places
        .filter((p) => !citySlug || p.citySlug === citySlug)
        .map((p) => (
          <View key={`${p.citySlug}:${p.slug}`} style={{ gap: 8 }}>
            <Link
              href={{
                pathname: "/city/[citySlug]/place/[placeSlug]",
                params: { citySlug: p.citySlug, placeSlug: p.slug },
              }}
              asChild
            >
              <PrimaryButton wrapLabel label={p.name} />
            </Link>
            <PrimaryButton
              wrapLabel
              tone="secondary"
              label={t.removePlace}
              accessibilityLabel={`${t.removePlace}: ${p.name}`}
              onPress={() => void remove(() => toggleSavedPlace(p))}
            />
          </View>
        ))}
    </Screen>
  );
}
