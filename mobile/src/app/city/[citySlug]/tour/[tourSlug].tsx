import { Image } from "expo-image";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppText, MotionView, PressableSurface, PrimaryButton, Screen, StatusMessage } from "../../../../components/ui";
import { MediaAttribution } from "../../../../components/MediaAttribution";
import { CitywalkLoading } from "../../../../components/CitywalkLoading";
import { NativeIcon } from "../../../../components/NativeIcon";
import { colors, motion, radius, spacing } from "../../../../design/tokens";
import { usePublicCity } from "../../../../hooks/usePublicContent";
import { citywalkApi } from "../../../../lib/api/instance";
import { selectImageUrl, selectPrimaryImageMedia } from "../../../../lib/api/media";
import { triggerCitywalkHaptic } from "../../../../lib/haptics";
import { getNativeDirection, getNativeTextAlignment } from "../../../../lib/localization";
import {
  parseTourRouteIdentity,
  resolveTourForRoute,
} from "../../../../lib/routing";
import { createMobileTripPlaceParams } from "../../../../lib/tripNavigation";
import { useNativeLocale } from "../../../../localization/LocaleProvider";

export default function TourScreen() {
  const params = useLocalSearchParams<{
    citySlug?: string | string[];
    tourSlug?: string | string[];
  }>();
  const identity = parseTourRouteIdentity(params.citySlug, params.tourSlug);
  const { direction: appDirection, locale, messages } = useNativeLocale();
  const cityState = usePublicCity(identity?.citySlug ?? "invalid", locale);

  if (!identity) return <Screen><StatusMessage>{messages.unavailable}</StatusMessage></Screen>;
  if (cityState.status === "loading") return <Screen><CitywalkLoading variant="city" /></Screen>;
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
  const tripIdentity = {
    id: `published-${tour.slug}`,
    citySlug: identity.citySlug,
    stopSlugs: stops.map(({ place }) => place.slug),
    source: "published" as const,
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: tour.content.title }} />
      <MotionView duration={motion.screen} style={styles.content}>
        {image && imageUrl ? (
          <View>
            <Image
              source={{ uri: citywalkApi.resolveUrl(imageUrl) }}
              cachePolicy="memory-disk"
              contentFit="cover"
              style={styles.hero}
              accessibilityLabel={tour.content.title}
              transition={motion.component}
            />
            <MediaAttribution attribution={image.attribution} />
          </View>
        ) : null}
        <View style={[styles.introduction, { direction }]}>
          <AppText variant="screenTitle" style={tourTextStyle}>
            {tour.content.title}
          </AppText>
          {tour.content.description || tour.content.shortDescription ? (
            <AppText style={[tourTextStyle, styles.description]}>
              {tour.content.description ?? tour.content.shortDescription}
            </AppText>
          ) : null}
          <View style={styles.summaryRow}>
            {tour.estimatedDurationMinutes ? (
              <View style={styles.summaryItem}>
                <NativeIcon ios="clock" android="schedule" color={colors.primary} size={18} />
                <AppText variant="metadata">{tour.estimatedDurationMinutes} {messages.minutes}</AppText>
              </View>
            ) : null}
            <View style={styles.summaryItem}>
              <NativeIcon ios="mappin.and.ellipse" android="route" color={colors.primary} size={18} />
              <AppText variant="metadata">{stops.length} {messages.stops}</AppText>
            </View>
          </View>
          {tour.didFallback ? (
            <AppText variant="caption" style={styles.fallback}>
              {messages.fallbackContent}
            </AppText>
          ) : null}
        </View>

        <View style={styles.route}>
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
                params: createMobileTripPlaceParams(tripIdentity, index),
              }}
              asChild
            >
              <PressableSurface
                accessibilityRole="link"
                onPress={() => { void triggerCitywalkHaptic("light"); }}
                style={styles.stopCard}
              >
                <View style={styles.stopNumber}><AppText variant="caption" style={styles.stopNumberText}>{index + 1}</AppText></View>
                <View style={[styles.stopContent, { direction: placeDirection }]}>
                  <AppText variant="cardTitle" style={placeTextStyle}>
                    {place.content.name}
                  </AppText>
                  {stop.visitDurationMinutes ? (
                    <AppText variant="caption" style={styles.metadata}>
                      {stop.visitDurationMinutes} {messages.visitMinutes}
                    </AppText>
                  ) : null}
                </View>
                <NativeIcon ios={appDirection === "rtl" ? "chevron.left" : "chevron.right"} android={appDirection === "rtl" ? "chevron_left" : "chevron_right"} color={colors.textSubtle} size={18} />
              </PressableSurface>
            </Link>
        );
          })}
        </View>

        {stops[0] ? (
          <Link
            href={{
              pathname: "/city/[citySlug]/place/[placeSlug]",
              params: createMobileTripPlaceParams(tripIdentity, 0),
            }}
            asChild
          >
            <PrimaryButton
              haptic="medium"
              label={messages.startTour}
              leadingIcon={<NativeIcon ios="figure.walk" android="directions_walk" color="#FFFFFF" size={20} />}
            />
          </Link>
        ) : null}
      </MotionView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl },
  hero: { width: "100%", height: 240, borderRadius: radius.hero, backgroundColor: colors.primarySoft },
  introduction: { gap: spacing.sm },
  description: { color: colors.textMuted },
  summaryRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  summaryItem: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.pill, flexDirection: "row", gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  metadata: { color: colors.textMuted, marginTop: spacing.sm },
  fallback: { color: colors.violet, marginTop: spacing.sm },
  route: { gap: spacing.sm },
  stopCard: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.md, flexDirection: "row", gap: spacing.md, padding: spacing.md },
  stopNumber: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 32,
    justifyContent: "center",
    minWidth: 28,
    width: 32,
  },
  stopNumberText: { color: "#FFFFFF", textAlign: "center" },
  stopContent: { flex: 1 },
});
