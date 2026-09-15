import { Image } from "expo-image";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";

import { CitywalkLoading } from "../../../components/CitywalkLoading";
import { MediaAttribution } from "../../../components/MediaAttribution";
import { NativeCityMap } from "../../../components/NativeCityMap";
import { NativeIcon } from "../../../components/NativeIcon";
import { NativeTourPlanner } from "../../../components/NativeTourPlanner";
import {
  AppText,
  MotionView,
  PressableSurface,
  Screen,
  SectionTitle,
  StatusMessage,
  VirtualizedScreen,
} from "../../../components/ui";
import { colors, motion, radius, spacing } from "../../../design/tokens";
import { prefetchPublicPlace, usePublicCity } from "../../../hooks/usePublicContent";
import type { PublicPlaceCard, PublicTour } from "../../../lib/api/contracts";
import { citywalkApi } from "../../../lib/api/instance";
import { selectImageUrl, selectPrimaryImageMedia } from "../../../lib/api/media";
import { triggerCitywalkHaptic } from "../../../lib/haptics";
import { getNativeDirection, getNativeTextAlignment } from "../../../lib/localization";
import { parseCityRouteIdentity } from "../../../lib/routing";
import { useNativeLocale } from "../../../localization/LocaleProvider";

export default function CityScreen() {
  const params = useLocalSearchParams<{ citySlug?: string | string[] }>();
  const identity = parseCityRouteIdentity(params.citySlug);
  const { direction: appDirection, locale, messages } = useNativeLocale();
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
          <MotionView duration={motion.screen} style={styles.headerContent}>
            {cityImage && cityImageUrl ? (
              <View>
                <Image
                  source={{ uri: citywalkApi.resolveUrl(cityImageUrl) }}
                  cachePolicy="memory-disk"
                  contentFit="cover"
                  style={styles.cityHero}
                  accessibilityLabel={city.content.name}
                  transition={motion.component}
                />
                <MediaAttribution attribution={cityImage.attribution} />
              </View>
            ) : null}
            <View style={[styles.cityIntroduction, { direction: cityDirection }]}>
              <AppText variant="screenTitle" style={cityTextStyle}>{city.content.name}</AppText>
              {city.content.shortDescription ? (
                <AppText style={[cityTextStyle, styles.muted]}>{city.content.shortDescription}</AppText>
              ) : null}
              {city.content.description ? (
                <AppText style={[cityTextStyle, styles.muted]}>{city.content.description}</AppText>
              ) : null}
            </View>

            {tours.length > 0 ? (
              <View style={styles.section}>
                <SectionTitle>{messages.tours}</SectionTitle>
                {tours.map((tour) => (
                  <TourCard
                    key={tour.slug}
                    citySlug={city.slug}
                    tour={tour}
                    places={places}
                    messages={messages}
                    appDirection={appDirection}
                  />
                ))}
              </View>
            ) : null}

            {plannerOrigin ? (
              <NativeTourPlanner citySlug={city.slug} places={places} origin={plannerOrigin} />
            ) : null}

            <View style={styles.section}>
              <SectionTitle>{messages.map}</SectionTitle>
              <NativeCityMap places={places} />
            </View>
            <SectionTitle>{messages.places}</SectionTitle>
          </MotionView>
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
  appDirection,
}: Readonly<{
  citySlug: string;
  tour: PublicTour;
  places: readonly PublicPlaceCard[];
  messages: ReturnType<typeof useNativeLocale>["messages"];
  appDirection: "ltr" | "rtl";
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
    <MotionView style={styles.tourCard}>
      <Link
        href={{ pathname: "/city/[citySlug]/tour/[tourSlug]", params: { citySlug, tourSlug: tour.slug } }}
        asChild
      >
        <PressableSurface
          accessibilityRole="link"
          onPress={() => { void triggerCitywalkHaptic("medium"); }}
          style={styles.tourLink}
        >
          {image && imageUrl ? (
            <Image
              source={{ uri: citywalkApi.resolveUrl(imageUrl) }}
              cachePolicy="memory-disk"
              contentFit="cover"
              style={styles.placeImage}
              accessibilityLabel={tour.content.title}
              transition={motion.component}
            />
          ) : null}
          <View style={[styles.tourContent, { direction }]}>
            <AppText variant="heading" style={textStyle}>{tour.content.title}</AppText>
            {tour.content.shortDescription || tour.content.description ? (
              <AppText numberOfLines={3} style={[textStyle, styles.description]}>{tour.content.shortDescription ?? tour.content.description}</AppText>
            ) : null}
            <AppText variant="caption" style={styles.metadata}>
              {tour.estimatedDurationMinutes ? `${tour.estimatedDurationMinutes} ${messages.minutes} · ` : ""}
              {tour.stops.length} {messages.stops}
            </AppText>
            <AppText numberOfLines={2} variant="caption" style={styles.stopName}>
              {stopNames.join(" · ")}
            </AppText>
            <View style={styles.startTourRow}>
              <AppText variant="label" style={styles.startTour}>{messages.startTour}</AppText>
              <NativeIcon ios={appDirection === "rtl" ? "arrow.left" : "arrow.right"} android={appDirection === "rtl" ? "arrow_back" : "arrow_forward"} color={colors.primary} size={18} />
            </View>
            {tour.didFallback ? (
              <AppText variant="caption" style={styles.fallback}>{messages.fallbackContent}</AppText>
            ) : null}
          </View>
        </PressableSurface>
      </Link>
      <View style={styles.cardAttribution}><MediaAttribution attribution={image?.attribution} /></View>
    </MotionView>
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
    <View style={styles.placeCard}>
      <Link
        href={{ pathname: "/city/[citySlug]/place/[placeSlug]", params: { citySlug, placeSlug: place.slug } }}
        asChild
      >
        <PressableSurface
          accessibilityRole="link"
          onPress={() => { void triggerCitywalkHaptic("light"); }}
          onPressIn={() => { void prefetchPublicPlace(citySlug, place.slug, locale).catch(() => undefined); }}
          style={styles.placeLink}
        >
          {image ? (
            <Image
              source={{ uri: citywalkApi.resolveUrl(image) }}
              cachePolicy="memory-disk"
              contentFit="cover"
              recyclingKey={`${citySlug}:${place.slug}`}
              style={styles.placeThumbnail}
              accessibilityLabel={place.content.name}
              transition={motion.press}
            />
          ) : null}
          <View style={[styles.placeContent, { direction }]}>
            <AppText numberOfLines={2} variant="cardTitle" style={textStyle}>{place.content.name}</AppText>
            <AppText numberOfLines={2} style={[textStyle, styles.description]}>{place.content.shortDescription}</AppText>
            <AppText variant="caption" style={styles.metadata}>
              {place.category.toUpperCase()} · {place.durationMinutes} {visitMinutes}
            </AppText>
          </View>
        </PressableSurface>
      </Link>
      <View style={styles.cardAttribution}><MediaAttribution attribution={imageMedia?.attribution} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContent: { gap: spacing.xl },
  cityHero: { width: "100%", height: 235, borderRadius: radius.hero, backgroundColor: colors.primarySoft },
  cityIntroduction: { gap: spacing.sm },
  section: { gap: spacing.md },
  placeImage: { width: "100%", height: 170, backgroundColor: colors.primarySoft },
  placeThumbnail: { alignSelf: "stretch", backgroundColor: colors.primarySoft, width: 108 },
  placeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  placeLink: { alignItems: "center", flexDirection: "row", minHeight: 120 },
  placeContent: { flex: 1, gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  metadata: { color: colors.textMuted, marginTop: spacing.xs },
  muted: { color: colors.textMuted },
  description: { color: colors.textMuted },
  tourCard: { backgroundColor: colors.surface, borderRadius: radius.lg, marginTop: spacing.md, overflow: "hidden" },
  tourLink: { overflow: "hidden" },
  tourContent: { gap: spacing.xs, padding: spacing.md },
  cardAttribution: { paddingBottom: spacing.sm, paddingHorizontal: spacing.md },
  fallback: { color: colors.violet, marginTop: spacing.xs },
  stopName: { color: colors.textMuted, marginTop: spacing.xs },
  startTour: { color: colors.primary, marginTop: spacing.md },
  startTourRow: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
});
