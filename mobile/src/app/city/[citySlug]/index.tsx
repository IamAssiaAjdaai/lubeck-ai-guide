import { Image } from "expo-image";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { NativeCityMap } from "../../../components/NativeCityMap";
import { AppText, Card, Screen, SectionTitle, StatusMessage } from "../../../components/ui";
import { colors, radius, spacing } from "../../../design/tokens";
import { usePublicCity } from "../../../hooks/usePublicContent";
import { citywalkApi } from "../../../lib/api/instance";
import { selectPrimaryImage } from "../../../lib/api/media";
import { getNativeDirection } from "../../../lib/localization";
import { parseCityRouteIdentity } from "../../../lib/routing";
import { useNativeLocale } from "../../../localization/LocaleProvider";

export default function CityScreen() {
  const params = useLocalSearchParams<{ citySlug?: string | string[] }>();
  const identity = parseCityRouteIdentity(params.citySlug);
  const { locale, messages } = useNativeLocale();
  const cityState = usePublicCity(identity?.citySlug ?? "invalid", locale);

  if (!identity) return <Screen><StatusMessage>{messages.unavailable}</StatusMessage></Screen>;
  if (cityState.status === "loading") return <Screen><AppText>{messages.loading}</AppText></Screen>;
  if (cityState.status === "error") return <Screen><StatusMessage>{messages.unavailable}</StatusMessage></Screen>;

  const { city, places } = cityState.data;
  const cityDirection = getNativeDirection(city.resolvedLocale);
  return (
    <Screen>
      <Stack.Screen options={{ title: city.content.name }} />
      <View style={{ direction: cityDirection }}>
        <AppText variant="title" style={{ writingDirection: cityDirection }}>{city.content.name}</AppText>
        {city.content.shortDescription ? (
          <AppText style={{ writingDirection: cityDirection, color: colors.textMuted }}>{city.content.shortDescription}</AppText>
        ) : null}
      </View>

      <SectionTitle>{messages.map}</SectionTitle>
      <NativeCityMap places={places} />

      <SectionTitle>{messages.places}</SectionTitle>
      {places.map((place) => {
        const image = selectPrimaryImage(place.media, place.image);
        const contentDirection = getNativeDirection(place.resolvedLocale);
        return (
          <Link
            key={place.slug}
            href={{ pathname: "/city/[citySlug]/place/[placeSlug]", params: { citySlug: city.slug, placeSlug: place.slug } }}
            asChild
          >
            <Pressable accessibilityRole="link">
              <Card>
                {image ? (
                  <Image
                    source={{ uri: citywalkApi.resolveUrl(image) }}
                    contentFit="cover"
                    style={styles.placeImage}
                    accessibilityLabel={place.content.name}
                  />
                ) : null}
                <View style={{ direction: contentDirection }}>
                  <AppText variant="heading" style={{ writingDirection: contentDirection }}>{place.content.name}</AppText>
                  <AppText style={{ writingDirection: contentDirection }}>{place.content.shortDescription}</AppText>
                  <AppText variant="caption" style={styles.metadata}>{place.category.toUpperCase()} · {place.durationMinutes} {messages.visitMinutes}</AppText>
                </View>
              </Card>
            </Pressable>
          </Link>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  placeImage: { width: "100%", height: 150, borderRadius: radius.md, backgroundColor: "#EEF2FF" },
  metadata: { color: colors.textMuted, marginTop: spacing.sm },
});
