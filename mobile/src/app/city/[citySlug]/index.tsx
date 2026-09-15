import { Image } from "expo-image";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { CitywalkLoading } from "../../../components/CitywalkLoading";
import { MediaAttribution } from "../../../components/MediaAttribution";
import { NativeCityMap } from "../../../components/NativeCityMap";
import { NativeTourPlanner } from "../../../components/NativeTourPlanner";
import {
  AppText,
  Card,
  Screen,
  SectionTitle,
  StatusMessage,
  VirtualizedScreen,
} from "../../../components/ui";
import { colors, radius, spacing } from "../../../design/tokens";
import { prefetchPublicPlace, usePublicCity } from "../../../hooks/usePublicContent";
import type { PublicPlaceCard, PublicTour } from "../../../lib/api/contracts";
import { citywalkApi } from "../../../lib/api/instance";
import { selectImageUrl, selectPrimaryImageMedia } from "../../../lib/api/media";
import { getNativeDirection, getNativeTextAlignment } from "../../../lib/localization";
import { parseCityRouteIdentity } from "../../../lib/routing";
import { useNativeLocale } from "../../../localization/LocaleProvider";

export default function CityScreen() {
  const params = useLocalSearchParams<{ citySlug?: string | string[] }>();
  const identity = parseCityRouteIdentity(params.citySlug);
  const { locale, messages } = useNativeLocale();
  const cityState = usePublicCity(identity?.citySlug ?? "invalid", locale);

  if (!identity) return <Screen><StatusMessage>{messages.unavailable}</StatusMessage></Screen>;
  if (cityState.status === "loading") return <Screen><CitywalkLoading variant="city" /></Screen>;
  if (cityState.status === "error") return <Screen><StatusMessage>{messages.unavailable}</StatusMessage></Screen>;

  const { city, places, tours } = cityState.data;
  const cityDirection = getNativeDirection(city.resolvedLocale);
  const cityTextStyle = {
    writingDirection: cityDirection,
    textAlign: getNativeTextAlignment(city.resolvedLocale),
  } as const;
  const cityImage = selectPrimaryImageMedia(city.media);
  const cityImageUrl = selectImageUrl(cityImage, undefined, undefined, "hero");
  const firstTourStop = tours[0]
    ? [...tours[0].stops].sort((first, second) => first.position - second.position)[0]
    : undefined;
  const plannerOrigin = places.find(({ slug }) => slug === firstTourStop?.placeSlug)?.coordinates ??
    places[0]?.coordinates;

  return (
    <>
      <Stack.Screen options={{ title: city.content.name }} />
      <VirtualizedScreen
        data={places}
        keyExtractor={(place) => place.slug}
        initialNumToRender={4}
        maxToRenderPerBatch={5}
        windowSize={5}
        ListHeaderComponent={(
          <View style={styles.headerContent}>
            {cityImage && cityImageUrl ? (
              <View>
                <Image
                  source={{ uri: citywalkApi.resolveUrl(cityImageUrl) }}
                  cachePolicy="memory-disk"
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
                <AppText style={[cityTextStyle, styles.muted]}>{city.content.shortDescription}</AppText>
              ) : null}
              {city.content.description ? (
                <AppText style={[cityTextStyle, styles.muted]}>{city.content.description}</AppText>
              ) : null}
            </View>

            {tours.length > 0 ? (
              <View>
                <SectionTitle>{messages.tours}</SectionTitle>
                {tours.map((tour) => (
                  <TourCard
                    key={tour.slug}
                    citySlug={city.slug}
                    tour={tour}
                    places={places}
                    messages={messages}
                  />
                ))}
              </View>
            ) : null}

            {plannerOrigin ? (
              <NativeTourPlanner citySlug={city.slug} places={places} origin={plannerOrigin} />
            ) : null}

            <SectionTitle>{messages.map}</SectionTitle>
            <NativeCityMap places={places} />
            <SectionTitle>{messages.places}</SectionTitle>
          </View>
        )}
        renderItem={({ item }) => (
          <PlaceCard
            citySlug={city.slug}
            locale={locale}
            place={item}
            visitMinutes={messages.visitMinutes}
          />
        )}
      />
    </>
  );
}

function TourCard({
  citySlug,
  tour,
  places,
  messages,
}: Readonly<{
  citySlug: string;
  tour: PublicTour;
  places: readonly PublicPlaceCard[];
  messages: ReturnType<typeof useNativeLocale>["messages"];
}>) {
  const image = selectPrimaryImageMedia(tour.media);
  const imageUrl = selectImageUrl(image, undefined, undefined, "card");
  const direction = getNativeDirection(tour.resolvedLocale);
  const textStyle = {
    writingDirection: direction,
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
      href={{ pathname: "/city/[citySlug]/tour/[tourSlug]", params: { citySlug, tourSlug: tour.slug } }}
      asChild
    >
      <Pressable accessibilityRole="link" style={styles.tourLink}>
        <Card>
          {image && imageUrl ? (
            <Image
              source={{ uri: citywalkApi.resolveUrl(imageUrl) }}
              cachePolicy="memory-disk"
              contentFit="cover"
              style={styles.placeImage}
              accessibilityLabel={tour.content.title}
            />
          ) : null}
          <View style={{ direction }}>
            <AppText variant="heading" style={textStyle}>{tour.content.title}</AppText>
            {tour.content.shortDescription || tour.content.description ? (
              <AppText style={textStyle}>{tour.content.shortDescription ?? tour.content.description}</AppText>
            ) : null}
            <AppText variant="caption" style={styles.metadata}>
              {tour.estimatedDurationMinutes ? `${tour.estimatedDurationMinutes} ${messages.minutes} · ` : ""}
              {tour.stops.length} {messages.stops}
            </AppText>
            {stopNames.map((name, index) => (
              <AppText key={`${tour.slug}-${index}`} variant="caption" style={styles.stopName}>
                {index + 1}. {name}
              </AppText>
            ))}
            <AppText variant="label" style={styles.startTour}>{messages.startTour} →</AppText>
            {tour.didFallback ? (
              <AppText variant="caption" style={styles.fallback}>{messages.fallbackContent}</AppText>
            ) : null}
            <MediaAttribution attribution={image?.attribution} />
          </View>
        </Card>
      </Pressable>
    </Link>
  );
}

function PlaceCard({
  citySlug,
  locale,
  place,
  visitMinutes,
}: Readonly<{
  citySlug: string;
  locale: Parameters<typeof prefetchPublicPlace>[2];
  place: PublicPlaceCard;
  visitMinutes: string;
}>) {
  const imageMedia = selectPrimaryImageMedia(place.media);
  const image = selectImageUrl(imageMedia, place.image, place.imageVariants, "card");
  const direction = getNativeDirection(place.resolvedLocale);
  const textStyle = {
    writingDirection: direction,
    textAlign: getNativeTextAlignment(place.resolvedLocale),
  } as const;
  return (
    <Link
      href={{ pathname: "/city/[citySlug]/place/[placeSlug]", params: { citySlug, placeSlug: place.slug } }}
      asChild
    >
      <Pressable
        accessibilityRole="link"
        onPressIn={() => { void prefetchPublicPlace(citySlug, place.slug, locale).catch(() => undefined); }}
        style={styles.placeLink}
      >
        <Card>
          {image ? (
            <View>
              <Image
                source={{ uri: citywalkApi.resolveUrl(image) }}
                cachePolicy="memory-disk"
                contentFit="cover"
                recyclingKey={`${citySlug}:${place.slug}`}
                style={styles.placeImage}
                accessibilityLabel={place.content.name}
              />
              <MediaAttribution attribution={imageMedia?.attribution} />
            </View>
          ) : null}
          <View style={{ direction }}>
            <AppText variant="heading" style={textStyle}>{place.content.name}</AppText>
            <AppText style={textStyle}>{place.content.shortDescription}</AppText>
            <AppText variant="caption" style={styles.metadata}>
              {place.category.toUpperCase()} · {place.durationMinutes} {visitMinutes}
            </AppText>
          </View>
        </Card>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  headerContent: { gap: spacing.lg },
  cityHero: { width: "100%", height: 210, borderRadius: radius.lg, backgroundColor: "#EEF2FF" },
  placeImage: { width: "100%", height: 150, borderRadius: radius.md, backgroundColor: "#EEF2FF" },
  placeLink: { marginBottom: spacing.lg },
  metadata: { color: colors.textMuted, marginTop: spacing.sm },
  muted: { color: colors.textMuted },
  tourLink: { marginTop: spacing.md },
  fallback: { color: colors.violet, marginTop: spacing.xs },
  stopName: { color: colors.textMuted, marginTop: spacing.xs },
  startTour: { color: colors.primary, marginTop: spacing.md },
});
