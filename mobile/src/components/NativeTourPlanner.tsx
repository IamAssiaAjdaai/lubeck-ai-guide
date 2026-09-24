import { Link } from "expo-router";
import { View } from "react-native";
import { walkCopy } from "@citywalk/traveler-core/walkCopy";
import { rankNativePlaces, DEFAULT_NATIVE_TOUR_PREFERENCES } from "../lib/tourPlanning";
import type { PublicPlaceCard } from "../lib/api/contracts";
import { useNativeLocale } from "../localization/LocaleProvider";
import { AppText, PrimaryButton, SectionTitle } from "./ui";
export function NativeTourPlanner({ citySlug, places, origin }: { citySlug: string; places: readonly PublicPlaceCard[]; origin?: { lat: number; lng: number } }) {
  const { locale, messages } = useNativeLocale(), t = walkCopy(locale);
  const recommended = rankNativePlaces(places, DEFAULT_NATIVE_TOUR_PREFERENCES, origin ?? places[0]?.coordinates ?? { lat: 0, lng: 0 }).slice(0, 3);
  return <View style={{ gap: 12 }}>
    <Link href={{ pathname: "/city/[citySlug]/walk", params: { citySlug } }} asChild><PrimaryButton wrapLabel label={t.build} /></Link>
    <SectionTitle>{t.suggested}</SectionTitle>
    {recommended.map(place => <Link key={place.slug} href={{ pathname: "/city/[citySlug]/place/[placeSlug]", params: { citySlug, placeSlug: place.slug } }} asChild><PrimaryButton wrapLabel tone="secondary" label={place.content.name} /></Link>)}
    <AppText variant="caption">{messages.distanceDisclaimer}</AppText>
  </View>;
}
