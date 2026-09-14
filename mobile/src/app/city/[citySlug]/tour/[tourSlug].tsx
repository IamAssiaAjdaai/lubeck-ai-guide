import { Image } from "expo-image";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, Card, PrimaryButton, Screen, StatusMessage } from "../../../../components/ui";
import { MediaAttribution } from "../../../../components/MediaAttribution";
import { CitywalkLoading } from "../../../../components/CitywalkLoading";
import { colors, radius, spacing } from "../../../../design/tokens";
import { usePublicCity } from "../../../../hooks/usePublicContent";
import { citywalkApi } from "../../../../lib/api/instance";
import { selectImageUrl, selectPrimaryImageMedia } from "../../../../lib/api/media";
import { getNativeDirection, getNativeTextAlignment } from "../../../../lib/localization";
import {
  parseTourRouteIdentity,
  resolveTourForRoute,
} from "../../../../lib/routing";
import { useNativeLocale } from "../../../../localization/LocaleProvider";

export default function TourScreen() {
  const params = useLocalSearchParams<{
    citySlug?: string | string[];
    tourSlug?: string | string[];
  }>();
  const identity = parseTourRouteIdentity(params.citySlug, params.tourSlug);
  const { locale, messages } = useNativeLocale();
  const cityState = usePublicCity(identity?.citySlug ?? "invalid", locale);

  if (!identity) return <Screen><StatusMessage>{messages.unavailable}</StatusMessage></Screen>;
  if (cityState.status === "loading") return <Screen><CitywalkLoading /></Screen>;
  if (cityState.status === "error") return <Screen><StatusMessage>{messages.unavailable}</StatusMessage></Screen>;

  const tour = resolveTourForRoute(cityState.data, identity);
  if (!tour) return <Screen><StatusMessage>{messages.unavailable}</StatusMessage></Screen>;

  const placesBySlug = new Map(cityState.data.places.map((place) => [place.slug, place]));
  const stops = [...tour.stops]
    .sort((a, b) => a.position - b.position)
    .flatMap((stop) => {
      const place = placesBySlug.get(stop.placeSlug);
      return place ? [{ stop, place }] : [];
    });
  const direction = getNativeDirection(tour.resolvedLocale);
  const tourTextStyle = {
    writingDirection: direction,
    textAlign: getNativeTextAlignment(tour.resolvedLocale),
  } as const;
  const image = selectPrimaryImageMedia(tour.media);
  const imageUrl = selectImageUrl(image, undefined, undefined, "detail");

  return (
    <Screen>
      <Stack.Screen options={{ title: tour.content.title }} />
      {image && imageUrl ? (
        <View>
          <Image
            source={{ uri: citywalkApi.resolveUrl(imageUrl) }}
            cachePolicy="memory-disk"
            contentFit="cover"
            style={styles.hero}
            accessibilityLabel={tour.content.title}
          />
          <MediaAttribution attribution={image.attribution} />
        </View>
      ) : null}
      <View style={{ direction }}>
        <AppText variant="title" style={tourTextStyle}>
          {tour.content.title}
        </AppText>
        {tour.content.description || tour.content.shortDescription ? (
          <AppText style={tourTextStyle}>
            {tour.content.description ?? tour.content.shortDescription}
          </AppText>
        ) : null}
        <AppText variant="caption" style={styles.metadata}>
          {tour.estimatedDurationMinutes
            ? `${messages.estimatedDuration}: ${tour.estimatedDurationMinutes} ${messages.minutes} · `
            : ""}
          {stops.length} {messages.stops}
        </AppText>
        {tour.didFallback ? (
          <AppText variant="caption" style={styles.fallback}>
            {messages.fallbackContent}
          </AppText>
        ) : null}
      </View>

      {stops.map(({ stop, place }, index) => {
        const placeDirection = getNativeDirection(place.resolvedLocale);
        const placeTextStyle = {
          writingDirection: placeDirection,
          textAlign: getNativeTextAlignment(place.resolvedLocale),
        } as const;
        return (
          <Link
            key={`${tour.slug}-${stop.position}-${place.slug}`}
            href={{
              pathname: "/city/[citySlug]/place/[placeSlug]",
              params: { citySlug: identity.citySlug, placeSlug: place.slug },
            }}
            asChild
          >
            <Pressable accessibilityRole="link">
              <Card style={styles.stopCard}>
                <AppText variant="caption" style={styles.stopNumber}>{index + 1}</AppText>
                <View style={[styles.stopContent, { direction: placeDirection }]}>
                  <AppText variant="heading" style={placeTextStyle}>
                    {place.content.name}
                  </AppText>
                  {stop.visitDurationMinutes ? (
                    <AppText variant="caption" style={styles.metadata}>
                      {stop.visitDurationMinutes} {messages.visitMinutes}
                    </AppText>
                  ) : null}
                </View>
              </Card>
            </Pressable>
          </Link>
        );
      })}

      {stops[0] ? (
        <Link
          href={{
            pathname: "/city/[citySlug]/place/[placeSlug]",
            params: { citySlug: identity.citySlug, placeSlug: stops[0].place.slug },
          }}
          asChild
        >
          <PrimaryButton label={messages.startTour} />
        </Link>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { width: "100%", height: 220, borderRadius: radius.lg, backgroundColor: "#EEF2FF" },
  metadata: { color: colors.textMuted, marginTop: spacing.sm },
  fallback: { color: colors.violet, marginTop: spacing.sm },
  stopCard: { alignItems: "center", flexDirection: "row" },
  stopNumber: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    color: "#FFFFFF",
    minWidth: 28,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    textAlign: "center",
  },
  stopContent: { flex: 1 },
});
