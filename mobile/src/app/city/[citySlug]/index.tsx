import { useEffect, useRef, useState } from "react";
import { walkCopy, walkCategoryLabel } from "@citywalk/traveler-core/walkCopy";
import { calculateDistanceMeters } from "@citywalk/traveler-core";
import { requestForegroundLocation } from "../../../lib/location";
import { expoForegroundLocationAdapter } from "../../../lib/location.expo";
import { NativeContentImage as Image } from "../../../components/NativeContentImage";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { FlatList, StyleSheet, View } from "react-native";

import { discoveryCopy } from "../../../design/discoveryCopy";
import { WalkChoices } from "../../../components/WalkControls";
import { CitywalkLoading } from "../../../components/CitywalkLoading";
import { MediaAttribution } from "../../../components/MediaAttribution";
import { NativeCityMap } from "../../../components/NativeCityMap";
import { NativeIcon } from "../../../components/NativeIcon";
import { V2Hero } from "../../../components/V2Presentation";
import {
  AppText,
  PrimaryButton,
  MotionView,
  PressableSurface,
  Screen,
  SectionTitle,
  StatusMessage,
  VirtualizedScreen,
} from "../../../components/ui";
import { colors, motion, radius, spacing } from "../../../design/tokens";
import {
  prefetchPublicPlace,
  usePublicCity,
} from "../../../hooks/usePublicContent";
import type { PublicPlaceCard, PublicTour } from "../../../lib/api/contracts";
import { citywalkApi } from "../../../lib/api/instance";
import {
  selectImageUrl,
  selectPrimaryImageMedia,
} from "../../../lib/api/media";
import { triggerCitywalkHaptic } from "../../../lib/haptics";
import {
  getNativeDirection,
  getNativeTextAlignment,
} from "../../../lib/localization";
import { parseCityRouteIdentity } from "../../../lib/routing";
import { useNativeLocale } from "../../../localization/LocaleProvider";

export default function CityScreen() {
  const params = useLocalSearchParams<{
    citySlug?: string | string[];
    section?: string;
  }>();
  const identity = parseCityRouteIdentity(params.citySlug);
  const { direction: appDirection, locale, messages } = useNativeLocale();
  const t = walkCopy(locale);
  const list = useRef<FlatList<PublicPlaceCard>>(null);
  const placesOffset = useRef(0);
  const [measuredPlacesOffset, setMeasuredPlacesOffset] = useState<number>();
  const headerOffset = useRef(0);
  const [category, setCategory] = useState("all");
  const [mapVisible, setMapVisible] = useState(false);
  const labels = discoveryCopy(locale);
  const [near, setNear] = useState<{ lat: number; lng: number }>();
  const [locationMessage, setLocationMessage] = useState("");
  const [locating, setLocating] = useState(false);
  const cityState = usePublicCity(identity?.citySlug ?? "invalid", locale);
  useEffect(() => {
    if (params.section !== "places" || cityState.status !== "available") return;
    if (measuredPlacesOffset !== undefined)
      list.current?.scrollToOffset({ offset: measuredPlacesOffset, animated: true });
  }, [params.section, cityState.status, measuredPlacesOffset]);

  if (!identity)
    return (
      <Screen>
        <StatusMessage>{messages.unavailable}</StatusMessage>
      </Screen>
    );
  if (cityState.status === "loading")
    return (
      <Screen>
        <CitywalkLoading variant="city" />
      </Screen>
    );
  if (cityState.status === "error")
    return (
      <Screen>
        <StatusMessage>{messages.unavailable}</StatusMessage>
      </Screen>
    );

  const { city, places, tours } = cityState.data;
  const filteredPlaces = places.filter(
    (place) => category === "all" || place.category === category,
  );
  const visiblePlaces = near
    ? [...filteredPlaces].sort(
        (a, b) =>
          (calculateDistanceMeters(near, a.coordinates) ?? Infinity) -
          (calculateDistanceMeters(near, b.coordinates) ?? Infinity),
      )
    : filteredPlaces;

  return (
    <>
      <Stack.Screen options={{ title: city.content.name }} />
      <VirtualizedScreen
        ref={list}
        data={visiblePlaces}
        keyExtractor={(place) => place.slug}
        initialNumToRender={4}
        maxToRenderPerBatch={5}
        windowSize={5}
        ListHeaderComponent={
          <MotionView
            duration={motion.screen}
            style={styles.headerContent}
            onLayout={(event) => {
              headerOffset.current = event.nativeEvent.layout.y;
            }}
          >
            <V2Hero title={city.content.name} subtitle={t.hubSubtitle} city />
            <Link
              href={{
                pathname: "/city/[citySlug]/walk",
                params: { citySlug: city.slug },
              }}
              asChild
            >
              <PrimaryButton
                label={t.build}
                leadingIcon={
                  <NativeIcon
                    ios="location.fill"
                    android="near_me"
                    color={colors.surface}
                  />
                }
              />
            </Link>
            <View style={styles.quickActions}>
              <PrimaryButton
                compact
                style={styles.quickAction}
                tone="secondary"
                label={t.places}
                wrapLabel
                onPress={() =>
                  list.current?.scrollToOffset({
                    offset: placesOffset.current,
                    animated: true,
                  })
                }
                leadingIcon={
                  <NativeIcon ios="map" android="map" color={colors.primary} />
                }
              />
              <PrimaryButton
                compact
                style={styles.quickAction}
                tone="secondary"
                label={t.near}
                wrapLabel
                busy={locating}
                leadingIcon={
                  <NativeIcon
                    ios="mappin.and.ellipse"
                    android="place"
                    color={colors.primary}
                  />
                }
                onPress={() => {
                  setLocating(true);
                  void requestForegroundLocation(
                    expoForegroundLocationAdapter,
                  ).then((result) => {
                    setLocating(false);
                    if (result.status === "available") {
                      setNear({
                        lat: result.location.latitude,
                        lng: result.location.longitude,
                      });
                      setLocationMessage(t.nearest);
                      list.current?.scrollToOffset({
                        offset: placesOffset.current,
                        animated: true,
                      });
                    } else setLocationMessage(t.gpsHelp);
                  });
                }}
              />
              <Link
                href={{ pathname: "/saved", params: { citySlug: city.slug } }}
                asChild
              >
                <PrimaryButton
                  compact
                  style={styles.quickAction}
                  tone="secondary"
                  label={t.saved}
                  wrapLabel
                  leadingIcon={
                    <NativeIcon
                      ios="heart"
                      android="favorite_border"
                      color={colors.primary}
                    />
                  }
                />
              </Link>
              <PrimaryButton
                compact
                style={styles.quickAction}
                tone="secondary"
                label={t.ask}
                wrapLabel
                onPress={() => {
                  setLocationMessage(labels.chooseGuidePlace);
                  list.current?.scrollToOffset({ offset: placesOffset.current, animated: true });
                }}
                leadingIcon={<NativeIcon ios="bubble.left" android="chat_bubble_outline" color={colors.primary} />}
              />
            </View>
            {locationMessage ? (
              <StatusMessage>{locationMessage}</StatusMessage>
            ) : null}
            {tours.length > 0 ? (
              <View style={styles.section}>
                <SectionTitle>{t.suggested}</SectionTitle>
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

            {city.content.description ? (
              <AppText style={styles.muted}>{city.content.description}</AppText>
            ) : null}
            <View
              style={styles.section}
              onLayout={(event) => {
                placesOffset.current =
                  headerOffset.current + event.nativeEvent.layout.y;
                setMeasuredPlacesOffset(placesOffset.current);
              }}
            >
              <SectionTitle>{messages.places}</SectionTitle>
              <WalkChoices
                label={messages.places}
                showHeading={false}
                variant="segment"
                options={(["all", "see", "eat", "fun"] as const).map(
                  (value) => ({ value, label: labels[value] }),
                )}
                selected={[category]}
                onSelect={setCategory}
              />
              <WalkChoices
                label={messages.map}
                variant="segment"
                options={[
                  { value: "list", label: labels.list },
                  { value: "map", label: labels.map },
                ]}
                selected={[mapVisible ? "map" : "list"]}
                onSelect={(value) => setMapVisible(value === "map")}
              />
              {mapVisible ? <NativeCityMap places={visiblePlaces} /> : null}
            </View>
          </MotionView>
        }
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
  const firstPlace = places.find(
    (place) =>
      place.slug ===
      [...tour.stops].sort((a, b) => a.position - b.position)[0]?.placeSlug,
  );
  const image =
    selectPrimaryImageMedia(tour.media) ??
    (firstPlace ? selectPrimaryImageMedia(firstPlace.media) : undefined);
  const imageUrl = selectImageUrl(
    image,
    firstPlace?.image,
    firstPlace?.imageVariants,
    "card",
  );
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
        href={{
          pathname: "/city/[citySlug]/tour/[tourSlug]",
          params: { citySlug, tourSlug: tour.slug },
        }}
        asChild
      >
        <PressableSurface
          accessibilityRole="link"
          onPress={() => {
            void triggerCitywalkHaptic("medium");
          }}
          style={styles.tourLink}
        >
          {imageUrl ? (
            <Image
              source={{ uri: citywalkApi.resolveUrl(imageUrl) }}
              fallbackSource={
                firstPlace?.image
                  ? { uri: citywalkApi.resolveUrl(firstPlace.image) }
                  : undefined
              }
              cachePolicy="memory-disk"
              contentFit="cover"
              style={styles.placeImage}
              accessibilityLabel={tour.content.title}
              transition={motion.component}
            />
          ) : null}
          <View style={styles.tourContent}>
            <AppText variant="heading" style={textStyle}>
              {tour.content.title}
            </AppText>
            {tour.content.shortDescription || tour.content.description ? (
              <AppText
                numberOfLines={3}
                style={[textStyle, styles.description]}
              >
                {tour.content.shortDescription ?? tour.content.description}
              </AppText>
            ) : null}
            <AppText variant="caption" style={styles.metadata}>
              {tour.estimatedDurationMinutes
                ? `${tour.estimatedDurationMinutes} ${messages.minutes} · `
                : ""}
              {tour.stops.length} {messages.stops}
            </AppText>
            <View style={styles.chips}>
              {[
                ...new Set(
                  places
                    .filter((p) =>
                      tour.stops.some((s) => s.placeSlug === p.slug),
                    )
                    .flatMap((p) => p.tags ?? []),
                ),
              ]
                .slice(0, 2)
                .map((tag) => (
                  <AppText key={tag} variant="caption" style={styles.chip}>
                    {walkCategoryLabel(
                      tag,
                      firstPlace?.requestedLocale ?? "en",
                    )}
                  </AppText>
                ))}
            </View>
            <AppText
              numberOfLines={2}
              variant="caption"
              style={styles.stopName}
            >
              {stopNames.join(" · ")}
            </AppText>
            <View style={styles.startTourRow}>
              <AppText variant="label" style={styles.startTour}>
                {messages.startTour}
              </AppText>
              <NativeIcon
                ios={appDirection === "rtl" ? "arrow.left" : "arrow.right"}
                android={
                  appDirection === "rtl" ? "arrow_back" : "arrow_forward"
                }
                color={colors.primary}
                size={18}
              />
            </View>
            {tour.didFallback ? (
              <AppText variant="caption" style={styles.fallback}>
                {messages.fallbackContent}
              </AppText>
            ) : null}
          </View>
        </PressableSurface>
      </Link>
      <View style={styles.cardAttribution}>
        <MediaAttribution attribution={image?.attribution} />
      </View>
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
  const image = selectImageUrl(
    imageMedia,
    place.image,
    place.imageVariants,
    "card",
  );
  const direction = getNativeDirection(place.resolvedLocale);
  const textStyle = {
    writingDirection: direction,
    textAlign: getNativeTextAlignment(place.resolvedLocale),
  } as const;
  return (
    <View style={styles.placeCard}>
      <Link
        href={{
          pathname: "/city/[citySlug]/place/[placeSlug]",
          params: { citySlug, placeSlug: place.slug },
        }}
        asChild
      >
        <PressableSurface
          accessibilityRole="link"
          onPress={() => {
            void triggerCitywalkHaptic("light");
          }}
          onPressIn={() => {
            void prefetchPublicPlace(citySlug, place.slug, locale).catch(
              () => undefined,
            );
          }}
          style={styles.placeLink}
        >
          {image ? (
            <Image
              source={{ uri: citywalkApi.resolveUrl(image) }}
              fallbackSource={
                place.image
                  ? { uri: citywalkApi.resolveUrl(place.image) }
                  : undefined
              }
              cachePolicy="memory-disk"
              contentFit="cover"
              recyclingKey={`${citySlug}:${place.slug}`}
              style={styles.placeThumbnail}
              accessibilityLabel={place.content.name}
              transition={motion.press}
            />
          ) : null}
          <View style={styles.placeContent}>
            <AppText numberOfLines={2} variant="cardTitle" style={textStyle}>
              {place.content.name}
            </AppText>
            <AppText numberOfLines={2} style={[textStyle, styles.description]}>
              {place.content.shortDescription}
            </AppText>
            <AppText variant="caption" style={styles.metadata}>
              {discoveryCopy(locale)[place.category]} · {place.durationMinutes}{" "}
              {visitMinutes}
            </AppText>
          </View>
        </PressableSurface>
      </Link>
      <View style={styles.cardAttribution}>
        <MediaAttribution attribution={imageMedia?.attribution} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  quickActions: { flexDirection: "row", gap: spacing.sm },
  quickAction: {
    flex: 1,
    minWidth: 0,
    minHeight: 90,
    paddingHorizontal: spacing.xs,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: {
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  headerContent: { gap: spacing.md },
  cityHero: {
    width: "100%",
    height: 235,
    borderRadius: radius.hero,
    backgroundColor: colors.primarySoft,
  },
  cityIntroduction: { gap: spacing.sm },
  section: { gap: spacing.md },
  placeImage: {
    width: "37%",
    minHeight: 150,
    alignSelf: "stretch",
    backgroundColor: colors.primarySoft,
  },
  placeThumbnail: {
    alignSelf: "stretch",
    backgroundColor: colors.primarySoft,
    width: 108,
  },
  placeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  placeLink: { alignItems: "center", flexDirection: "row", minHeight: 120 },
  placeContent: {
    flex: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  metadata: { color: colors.textMuted, marginTop: spacing.xs },
  muted: { color: colors.textMuted },
  description: { color: colors.textMuted },
  tourCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginTop: spacing.md,
    overflow: "hidden",
  },
  tourLink: { overflow: "hidden", flexDirection: "row" },
  tourContent: { flex: 1, gap: spacing.xs, padding: spacing.md },
  cardAttribution: { paddingBottom: spacing.sm, paddingHorizontal: spacing.md },
  fallback: { color: colors.violet, marginTop: spacing.xs },
  stopName: { color: colors.textMuted, marginTop: spacing.xs },
  startTour: { color: colors.primary, marginTop: spacing.md },
  startTourRow: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
});
