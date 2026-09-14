import { Image } from "expo-image";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { NativeCityMap } from "../../../components/NativeCityMap";
import { NativeTourPlanner } from "../../../components/NativeTourPlanner";
import { MediaAttribution } from "../../../components/MediaAttribution";
import { CitywalkLoading } from "../../../components/CitywalkLoading";
import { AppText, Card, Screen, SectionTitle, StatusMessage } from "../../../components/ui";
import { colors, radius, spacing } from "../../../design/tokens";
import { usePublicCity } from "../../../hooks/usePublicContent";
import { citywalkApi } from "../../../lib/api/instance";
import { selectPrimaryImage, selectPrimaryImageMedia } from "../../../lib/api/media";
import { getNativeDirection, getNativeTextAlignment } from "../../../lib/localization";
import { parseCityRouteIdentity } from "../../../lib/routing";
import { useNativeLocale } from "../../../localization/LocaleProvider";

export default function CityScreen() {
  const params = useLocalSearchParams<{ citySlug?: string | string[] }>();
  const identity = parseCityRouteIdentity(params.citySlug);
  const { locale, messages } = useNativeLocale();
  const cityState = usePublicCity(identity?.citySlug ?? "invalid", locale);

  if (!identity) return <Screen><StatusMessage>{messages.unavailable}</StatusMessage></Screen>;
  if (cityState.status === "loading") return <Screen><CitywalkLoading /></Screen>;
  if (cityState.status === "error") return <Screen><StatusMessage>{messages.unavailable}</StatusMessage></Screen>;

  const { city, places, tours } = cityState.data;
  const cityDirection = getNativeDirection(city.resolvedLocale);
  const cityTextStyle = {
    writingDirection: cityDirection,
    textAlign: getNativeTextAlignment(city.resolvedLocale),
  } as const;
  const cityImage = selectPrimaryImageMedia(city.media);
  const firstTourStop = tours[0]
    ? [...tours[0].stops].sort((first, second) => first.position - second.position)[0]
    : undefined;
  const plannerOrigin = places.find(({ slug }) => slug === firstTourStop?.placeSlug)?.coordinates ??
    places[0]?.coordinates;
  return (
    <Screen>
      <Stack.Screen options={{ title: city.content.name }} />
      {cityImage ? (
        <View>
          <Image
            source={{ uri: citywalkApi.resolveUrl(cityImage.url) }}
            contentFit="cover"
            style={styles.cityHero}
            accessibilityLabel={city.content.name}
          />
          <MediaAttribution attribution={cityImage.attribution} />
        </View>
      ) : null}
      <View style={{ direction: cityDirection }}>
        <AppText variant="title" style={cityTextStyle}>{city.content.name}</AppText>
        {city.content.shortDescription ? (
          <AppText style={[cityTextStyle, { color: colors.textMuted }]}>{city.content.shortDescription}</AppText>
        ) : null}
        {city.content.description ? (
          <AppText style={[cityTextStyle, { color: colors.textMuted }]}>{city.content.description}</AppText>
        ) : null}
      </View>

      {tours.length > 0 ? (
        <View>
          <SectionTitle>{messages.tours}</SectionTitle>
          {tours.map((tour) => {
            const image = selectPrimaryImageMedia(tour.media);
            const tourDirection = getNativeDirection(tour.resolvedLocale);
            const tourTextStyle = {
              writingDirection: tourDirection,
              textAlign: getNativeTextAlignment(tour.resolvedLocale),
            } as const;
            const stopNames = [...tour.stops]
              .sort((first, second) => first.position - second.position)
              .flatMap((stop) => {
                const place = places.find(({ slug }) => slug === stop.placeSlug);
                return place ? [place.content.name] : [];
              });
            return (
              <Link
                key={tour.slug}
                href={{
                  pathname: "/city/[citySlug]/tour/[tourSlug]",
                  params: { citySlug: city.slug, tourSlug: tour.slug },
                }}
                asChild
              >
                <Pressable accessibilityRole="link" style={styles.tourLink}>
                  <Card>
                    {image ? (
                      <Image
                        source={{ uri: citywalkApi.resolveUrl(image.url) }}
                        contentFit="cover"
                        style={styles.placeImage}
                        accessibilityLabel={tour.content.title}
                      />
                    ) : null}
                    <View style={{ direction: tourDirection }}>
                      <AppText variant="heading" style={tourTextStyle}>
                        {tour.content.title}
                      </AppText>
                      {tour.content.shortDescription || tour.content.description ? (
                        <AppText style={tourTextStyle}>
                          {tour.content.shortDescription ?? tour.content.description}
                        </AppText>
                      ) : null}
                      <AppText variant="caption" style={styles.metadata}>
                        {tour.estimatedDurationMinutes
                          ? `${tour.estimatedDurationMinutes} ${messages.minutes} · `
                          : ""}
                        {tour.stops.length} {messages.stops}
                      </AppText>
                      {stopNames.map((name, index) => (
                        <AppText key={`${tour.slug}-${index}`} variant="caption" style={styles.stopName}>
                          {index + 1}. {name}
                        </AppText>
                      ))}
                      <AppText variant="label" style={styles.startTour}>{messages.startTour} →</AppText>
                      {tour.didFallback ? (
                        <AppText variant="caption" style={styles.fallback}>
                          {messages.fallbackContent}
                        </AppText>
                      ) : null}
                      <MediaAttribution attribution={image?.attribution} />
                    </View>
                  </Card>
                </Pressable>
              </Link>
            );
          })}
        </View>
      ) : null}

      {plannerOrigin ? (
        <NativeTourPlanner citySlug={city.slug} places={places} origin={plannerOrigin} />
      ) : null}

      <SectionTitle>{messages.map}</SectionTitle>
      <NativeCityMap places={places} />

      <SectionTitle>{messages.places}</SectionTitle>
      {places.map((place) => {
        const imageMedia = selectPrimaryImageMedia(place.media);
        const image = imageMedia?.url ?? selectPrimaryImage(place.media, place.image);
        const contentDirection = getNativeDirection(place.resolvedLocale);
        const placeTextStyle = {
          writingDirection: contentDirection,
          textAlign: getNativeTextAlignment(place.resolvedLocale),
        } as const;
        return (
          <Link
            key={place.slug}
            href={{ pathname: "/city/[citySlug]/place/[placeSlug]", params: { citySlug: city.slug, placeSlug: place.slug } }}
            asChild
          >
            <Pressable accessibilityRole="link">
              <Card>
                {image ? (
                  <View>
                    <Image
                      source={{ uri: citywalkApi.resolveUrl(image) }}
                      contentFit="cover"
                      style={styles.placeImage}
                      accessibilityLabel={place.content.name}
                    />
                    <MediaAttribution attribution={imageMedia?.attribution} />
                  </View>
                ) : null}
                <View style={{ direction: contentDirection }}>
                  <AppText variant="heading" style={placeTextStyle}>{place.content.name}</AppText>
                  <AppText style={placeTextStyle}>{place.content.shortDescription}</AppText>
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
  cityHero: { width: "100%", height: 210, borderRadius: radius.lg, backgroundColor: "#EEF2FF" },
  placeImage: { width: "100%", height: 150, borderRadius: radius.md, backgroundColor: "#EEF2FF" },
  metadata: { color: colors.textMuted, marginTop: spacing.sm },
  tourLink: { marginTop: spacing.md },
  fallback: { color: colors.violet, marginTop: spacing.xs },
  stopName: { color: colors.textMuted, marginTop: spacing.xs },
  startTour: { color: colors.primary, marginTop: spacing.md },
});
