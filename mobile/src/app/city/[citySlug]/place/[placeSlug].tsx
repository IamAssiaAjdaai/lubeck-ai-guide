import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppText, Card, Screen, SectionTitle, StatusMessage } from "../../../../components/ui";
import { colors, radius, spacing } from "../../../../design/tokens";
import { usePublicCity } from "../../../../hooks/usePublicContent";
import { citywalkApi } from "../../../../lib/api/instance";
import { selectPrimaryImage } from "../../../../lib/api/media";
import { getNativeDirection } from "../../../../lib/localization";
import { parsePlaceRouteIdentity, resolvePlaceForRoute } from "../../../../lib/routing";
import { useNativeLocale } from "../../../../localization/LocaleProvider";

export default function PlaceScreen() {
  const params = useLocalSearchParams<{ citySlug?: string | string[]; placeSlug?: string | string[] }>();
  const identity = parsePlaceRouteIdentity(params.citySlug, params.placeSlug);
  const { locale, messages } = useNativeLocale();
  const cityState = usePublicCity(identity?.citySlug ?? "invalid", locale);

  if (!identity) return <Screen><StatusMessage>{messages.unavailable}</StatusMessage></Screen>;
  if (cityState.status === "loading") return <Screen><AppText>{messages.loading}</AppText></Screen>;
  if (cityState.status === "error") return <Screen><StatusMessage>{messages.unavailable}</StatusMessage></Screen>;

  const place = resolvePlaceForRoute(cityState.data, identity);
  if (!place) return <Screen><StatusMessage>{messages.unavailable}</StatusMessage></Screen>;
  const contentDirection = getNativeDirection(place.resolvedLocale);
  const image = selectPrimaryImage(place.media, place.image);

  return (
    <Screen>
      <Stack.Screen options={{ title: place.content.name }} />
      {image ? (
        <Image
          source={{ uri: citywalkApi.resolveUrl(image) }}
          contentFit="cover"
          style={styles.hero}
          accessibilityLabel={place.content.name}
        />
      ) : null}
      <View style={{ direction: contentDirection }}>
        <AppText variant="caption" style={styles.eyebrow}>{place.category.toUpperCase()} · {place.durationMinutes} {messages.visitMinutes}</AppText>
        <AppText variant="title" style={{ writingDirection: contentDirection }}>{place.content.name}</AppText>
        <AppText style={{ writingDirection: contentDirection }}>{place.content.description ?? place.content.shortDescription}</AppText>
      </View>
      {place.content.visitNote ? (
        <Card>
          <SectionTitle>{messages.visitorNote}</SectionTitle>
          <AppText style={{ writingDirection: contentDirection }}>{place.content.visitNote}</AppText>
        </Card>
      ) : null}
      {place.content.story ? (
        <View>
          <SectionTitle>{messages.story}</SectionTitle>
          <AppText style={{ writingDirection: contentDirection }}>{place.content.story}</AppText>
        </View>
      ) : null}
      {place.content.facts?.length ? (
        <View>
          <SectionTitle>{messages.facts}</SectionTitle>
          {place.content.facts.map((fact, index) => (
            <AppText key={`${place.slug}-fact-${index}`} style={{ writingDirection: contentDirection }}>• {fact}</AppText>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { width: "100%", height: 250, borderRadius: radius.lg, backgroundColor: "#EEF2FF" },
  eyebrow: { color: colors.primary, marginBottom: spacing.sm },
});
