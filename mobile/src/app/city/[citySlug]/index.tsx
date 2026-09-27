import { nativeTextBlock, nativeContentTextStyle, nativeRowStyle } from "../../../design/rtlPresentation";
import { nativeArabicDisplayText, nativeCategoryLabel } from "../../../lib/contentLabels";
import { ContentRecovery } from "../../../components/ContentRecovery";
import { WalkMembershipControl } from "../../../components/WalkMembershipControl";
import { nativeCityName, nativePlaceName } from "../../../lib/displayNames";
import { useEffect, useRef, useState } from "react";
import { walkCopy } from "@citywalk/traveler-core/walkCopy";
import { calculateDistanceMeters } from "@citywalk/traveler-core";
import { requestForegroundLocation } from "../../../lib/location";
import { expoForegroundLocationAdapter } from "../../../lib/location.expo";
import { NativeContentImage as Image } from "../../../components/NativeContentImage";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { FlatList, StyleSheet, View } from "react-native";

import { cityAssistantRoute } from "../../../lib/cityAssistant";
import { discoveryCopy } from "../../../design/discoveryCopy";
import { WalkChoices } from "../../../components/WalkControls";
import { CitywalkLoading } from "../../../components/CitywalkLoading";
import { MediaAttribution } from "../../../components/MediaAttribution";
import { NativeCityMap } from "../../../components/NativeCityMap";
import { NativeIcon } from "../../../components/NativeIcon";
import { ImageOverlayHero } from "../../../components/ImageOverlayHero";
import { useResponsiveTextLayout } from "../../../design/responsiveText";
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
import { getNativeDirection } from "../../../lib/localization";
import { parseCityRouteIdentity } from "../../../lib/routing";
import { useNativeLocale } from "../../../localization/LocaleProvider";

export default function CityScreen() {
  const textLayout = useResponsiveTextLayout();
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
    return <Screen><ContentRecovery retry={cityState.retry} citySlug={identity.citySlug} /></Screen>;

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
      <Stack.Screen options={{ title: nativeCityName(city.slug, city.content.name, locale) }} />
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
            <ImageOverlayHero title={nativeCityName(city.slug, city.content.name, locale)} subtitle={t.hubSubtitle} />
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
            <View style={[styles.quickActions, { direction: appDirection }]}>
              <PrimaryButton
                compact
                style={StyleSheet.flatten([styles.quickAction, { flex: 0, width: textLayout.quickWidth }])}
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
                style={StyleSheet.flatten([styles.quickAction, { flex: 0, width: textLayout.quickWidth }])}
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
                  style={StyleSheet.flatten([styles.quickAction, { flex: 0, width: textLayout.quickWidth }])}
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
              <Link href={cityAssistantRoute(city.slug)} asChild>
                <PrimaryButton compact style={StyleSheet.flatten([styles.quickAction, { flex: 0, width: textLayout.quickWidth }])} tone="secondary"
                  label={t.ask} wrapLabel
                  leadingIcon={<NativeIcon ios="bubble.left" android="chat_bubble_outline" color={colors.primary} />} />
              </Link>
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
                compact
                options={(["all", "see", "eat", "fun"] as const).map(
                  (value) => ({ value, label: labels[value] }),
                )}
                selected={[category]}
                onSelect={setCategory}
              />
              <WalkChoices
                label={messages.map}
                variant="segment"
                compact
                options={[
                  { value: "list", label: labels.list },
                  { value: "map", label: labels.map },
                ]}
                selected={[mapVisible ? "map" : "list"]}
                onSelect={(value) => setMapVisible(value === "map")}
              />
              {mapVisible ? <NativeCityMap citySlug={city.slug} places={visiblePlaces} /> : null}
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
  const { expanded } = useResponsiveTextLayout();
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
  const { locale: uiLocale } = useNativeLocale();
  const textStyle = nativeContentTextStyle(uiLocale, tour.resolvedLocale);
  const stopNames = [...tour.stops]
    .sort((first, second) => first.position - second.position)
    .flatMap((stop) => {
      const place = places.find(({ slug }) => slug === stop.placeSlug);
      return place ? [nativePlaceName(citySlug, place.slug, place.content.name, uiLocale)] : [];
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
          style={StyleSheet.flatten([styles.tourLink, nativeRowStyle(appDirection), expanded && { flexDirection: "column" }])}
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
              style={[styles.placeImage, expanded && { width: "100%", minHeight: 0, aspectRatio: 1.8 }]}
              accessibilityLabel={nativeArabicDisplayText(tour.content.title, uiLocale)}
              transition={motion.component}
            />
          ) : null}
          <View style={[styles.tourContent, nativeTextBlock(appDirection), expanded && { flex: 0, width: "100%" }]}>
            <AppText variant="heading" style={textStyle}>
              {nativeArabicDisplayText(tour.content.title, uiLocale)}
            </AppText>
            {tour.content.shortDescription || tour.content.description ? (
              <AppText
                numberOfLines={expanded ? undefined : 3}
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
                    {nativeCategoryLabel(
                      tag,
                      uiLocale,
                    )}
                  </AppText>
                ))}
            </View>
            <AppText
              numberOfLines={expanded ? undefined : 2}
              variant="caption"
              style={styles.stopName}
            >
              {stopNames.join(" · ")}
            </AppText>
            <View style={[styles.startTourRow, nativeRowStyle(appDirection)]}>
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
      {image?.attribution ? <View style={styles.cardAttribution}>
        <MediaAttribution attribution={image.attribution} />
      </View> : null}
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
  const { messages } = useNativeLocale();
  const direction = getNativeDirection(locale);
  const textStyle = nativeContentTextStyle(locale, place.resolvedLocale);
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
          style={StyleSheet.flatten([styles.placeLink, nativeRowStyle(direction)])}
        >
            <Image
              source={image ? { uri: citywalkApi.resolveUrl(image) } : undefined}
              placeholderIcon={place.category === "eat" ? { ios: "fork.knife", android: "restaurant" } : place.category === "fun" ? { ios: "sparkles", android: "auto_awesome" } : { ios: "mappin", android: "place" }}
              fallbackSource={
                place.image
                  ? { uri: citywalkApi.resolveUrl(place.image) }
                  : undefined
              }
              cachePolicy="memory-disk"
              contentFit="cover"
              recyclingKey={`${citySlug}:${place.slug}`}
              style={styles.placeThumbnail}
              accessibilityLabel={nativePlaceName(citySlug, place.slug, place.content.name, locale)}
              transition={motion.press}
            />
          <View style={[styles.placeContent, nativeTextBlock(direction)]}>
            <AppText numberOfLines={2} variant="cardTitle">
              {nativePlaceName(citySlug, place.slug, place.content.name, locale)}
            </AppText>
            {place.content.shortDescription ? <AppText numberOfLines={2} variant="metadata" style={[textStyle, styles.description]}>
              {place.content.shortDescription}
            </AppText> : null}
            {direction === "rtl" && place.didFallback ? <AppText variant="caption">{messages.fallbackContent}</AppText> : null}
            <AppText variant="caption" style={styles.metadata}>
              {discoveryCopy(locale)[place.category]} · {place.durationMinutes}{" "}
              {visitMinutes}
            </AppText>
          </View>
        </PressableSurface>
      </Link>
      <View style={styles.cardActions}><WalkMembershipControl citySlug={citySlug} placeSlug={place.slug} dense /></View>
      {imageMedia?.attribution ? <View style={styles.cardAttribution}>
        <MediaAttribution attribution={imageMedia.attribution} />
      </View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  quickActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
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
    backgroundColor: colors.primarySoft,
    width: 96,
    height: 96,
    flexShrink: 0,
    borderRadius: radius.sm,
  },
  placeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  placeLink: { alignItems: "flex-start", flexDirection: "row", minHeight: 120, padding: 12, gap: 12 },
  placeContent: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
    paddingVertical: 2,
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
  tourContent: { flex: 1, minWidth: 0, gap: spacing.xs, padding: spacing.md },
  cardActions: { paddingHorizontal: 12, paddingBottom: 12, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  cardAttribution: { paddingBottom: spacing.sm, paddingHorizontal: spacing.md },
  fallback: { color: colors.violet, marginTop: spacing.xs },
  stopName: { color: colors.textMuted, marginTop: spacing.xs },
  startTour: { color: colors.primary, flexShrink: 1 },
  startTourRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
});
