import { nativeTextBlock, nativeContentTextStyle, nativeRowStyle } from "../../../design/rtlPresentation";
import { nativeArabicDisplayText, nativeCategoryLabel } from "../../../lib/contentLabels";
import { ContentRecovery } from "../../../components/ContentRecovery";
import { WalkMembershipControl } from "../../../components/WalkMembershipControl";
import { nativeCityName, nativePlaceName } from "../../../lib/displayNames";
import { useEffect, useRef, useState } from "react";
import { nativeAuthClient } from "../../../lib/auth/client";
import { loadTravelerStyle } from "../../../lib/travelerStyle";
import { cityHubRecommendations } from "../../../lib/cityHubRecommendations";
import type { Interest } from "@citywalk/traveler-core/walkPlanner";
import { walkCopy } from "@citywalk/traveler-core/walkCopy";
import { calculateDistanceMeters } from "@citywalk/traveler-core";
import { requestForegroundLocation } from "../../../lib/location";
import { expoForegroundLocationAdapter } from "../../../lib/location.expo";
import { NativeContentImage as Image } from "../../../components/NativeContentImage";
import { Link, Stack, useLocalSearchParams, useNavigation, useRoute, type NativeStackNavigationProp } from "expo-router";
import { FlatList, Platform, StyleSheet, View, useWindowDimensions } from "react-native";

import { cityAssistantRoute } from "../../../lib/cityAssistant";
import { discoveryCopy } from "../../../design/discoveryCopy";
import { WalkChoices } from "../../../components/WalkControls";
import { CitywalkLoading } from "../../../components/CitywalkLoading";
import { MediaAttribution } from "../../../components/MediaAttribution";
import { NativeCityMap } from "../../../components/NativeCityMap";
import { NativeIcon } from "../../../components/NativeIcon";
import { CityPhotoCredits } from "../../../components/CityPhotoCredits";
import { cityHubBundledPhoto } from "../../../lib/cityHubPhotography";
import { CityHubHero } from "../../../components/CityHubHero";
import { useResponsiveTextLayout } from "../../../design/responsiveText";
import {
  AppText,
  PrimaryButton,
  MotionView,
  PressableSurface,
  Screen,
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

import { parsePlannerReturnEnvelope, plannerReturnIntents, type PlannerReturnContext } from "../../../lib/plannerReturnIntent";

// The helper resolves identity only. This native adapter revalidates at the dispatch boundary.
export function returnToRetainedPlanner(read: () => PlannerReturnContext, dispatch: (action: { type: "POP"; payload: { count: number }; source: string; target: string }) => void): boolean {
  const first = plannerReturnIntents.resolve(read());
  if (!first) return false;
  const final = plannerReturnIntents.resolve(read());
  if (!final || JSON.stringify(final) !== JSON.stringify(first)) return false;
  dispatch({ type: "POP", payload: { count: final.popCount }, source: final.sourceRouteKey, target: final.stackKey });
  plannerReturnIntents.revoke(final.targetRouteKey, final.mountToken);
  return true;
}
export default function CityScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();
  const route = useRoute();
  const returned = useRef(false);
  const { fontScale } = useWindowDimensions();
  const textLayout = useResponsiveTextLayout(3);
  const { data: session } = nativeAuthClient.useSession();
  const userId = session?.user.id;
  const [accountInterests, setAccountInterests] = useState<{ userId: string; interests: readonly Interest[] }>();
  useEffect(() => {
    let current = true;
    if (userId) void loadTravelerStyle(userId).then(style => {
      if (current) setAccountInterests({ userId, interests: style.interests });
    });
    return () => { current = false; };
  }, [userId]);
  const params = useLocalSearchParams<{
    citySlug?: string | string[];
    section?: string;
    returnToPlanner?: string;
    plannerReturnVersion?: string; plannerRouteKey?: string; plannerDraftToken?: string;
  }>();
  const identity = parseCityRouteIdentity(params.citySlug);
  const returnEnvelope = parsePlannerReturnEnvelope(params);
  useEffect(() => {
    if (!returnEnvelope && navigation.isFocused() && [params.returnToPlanner, params.plannerReturnVersion, params.plannerRouteKey, params.plannerDraftToken].some(value => value !== undefined))
      navigation.setParams({ returnToPlanner: undefined, plannerReturnVersion: undefined, plannerRouteKey: undefined, plannerDraftToken: undefined });
  }, [navigation, returnEnvelope, params.returnToPlanner, params.plannerReturnVersion, params.plannerRouteKey, params.plannerDraftToken]);
  const { direction: appDirection, locale, messages } = useNativeLocale();
  const t = walkCopy(locale);
  const list = useRef<FlatList<PublicPlaceCard>>(null);
  const placesOffset = useRef(0);
  const [measuredPlacesOffset, setMeasuredPlacesOffset] = useState<number>();
  const headerOffset = useRef(0);
  const [category, setCategory] = useState("all");
  const [mapVisible, setMapVisible] = useState(false);
  const [aboutExpanded, setAboutExpanded] = useState(false);
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
  const assistantRoute = cityAssistantRoute(city.slug);
  const guideRoute = returnEnvelope
    ? { ...assistantRoute, params: { ...assistantRoute.params, ...returnEnvelope } }
    : assistantRoute;
  const suggestedTours = cityHubRecommendations(tours, places, userId && accountInterests?.userId === userId ? accountInterests.interests : []);
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
        key={`city-hub-${fontScale}`}
        navigationLabelMaxFontSizeMultiplier={1.4}
        brandVariant="city-hub"
        contentContainerStyle={styles.hubContent}
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
            <CityHubHero city={city} />
            <View style={styles.primaryShell}>
            <View pointerEvents="none" style={StyleSheet.absoluteFill}><Image accessible={false} source={require("../../../../assets/images/city-hub-blue-fill.svg")} contentFit="fill" style={StyleSheet.absoluteFill} /></View>
            <Link
              onPress={event => {
                if (!navigation.isFocused() || returned.current) { event.preventDefault(); return; }
                const read = () => ({ params: route.params, citySlug: city.slug, stack: navigation.getState(),
                  focusedRouteKey: route.key, isFocused: navigation.isFocused() });
                if (returnToRetainedPlanner(read, action => navigation.dispatch(action))) {
                  returned.current = true;
                  event.preventDefault();
                }
              }}
              href={{
                pathname: "/city/[citySlug]/walk",
                params: { citySlug: city.slug },
              }}
              asChild
            >
              <PrimaryButton
                style={styles.buildMyWalk}
                label={t.build}
                labelStyle={fontScale > 2.5 ? { fontSize: 12, lineHeight: 18 } : undefined}
                trailingIcon={textLayout.expanded ? undefined : <NativeIcon ios={appDirection === "rtl" ? "arrow.left" : "arrow.right"} android={appDirection === "rtl" ? "arrow_back" : "arrow_forward"} size={19} color="#FFFFFF" />}
                leadingIcon={textLayout.expanded ? undefined :
                  <NativeIcon
                    ios="location.fill"
                    android="near_me"
                    color={colors.surface}
                  />
                }
              />
            </Link>
            </View>
            <View testID="city-hub-quick-actions" style={[styles.quickActions, { direction: appDirection }]}>
              <PrimaryButton
                compact
                style={StyleSheet.flatten([styles.quickAction, { flex: 0, width: textLayout.quickWidth }])}
                tone="secondary"
                label={t.places}
                labelStyle={[styles.quickLabel, appDirection === "rtl" && { textAlign: "right" }]} contentStyle={styles.quickContent}
                wrapLabel
                onPress={() =>
                  list.current?.scrollToOffset({
                    offset: placesOffset.current,
                    animated: true,
                  })
                }
                leadingIcon={
                  <View style={styles.quickIconRow}><View style={styles.quickIcon}><NativeIcon ios="map" android="map" color={colors.primary} size={20} /></View><NativeIcon ios={appDirection === "rtl" ? "chevron.left" : "chevron.right"} android={appDirection === "rtl" ? "chevron_left" : "chevron_right"} color={colors.textMuted} size={12} /></View>
                }
              />
              <PrimaryButton
                compact
                style={StyleSheet.flatten([styles.quickAction, { flex: 0, width: textLayout.quickWidth }])}
                tone="secondary"
                label={t.near}
                labelStyle={[styles.quickLabel, appDirection === "rtl" && { textAlign: "right" }]} contentStyle={styles.quickContent}
                wrapLabel
                busy={locating}
                leadingIcon={<View style={styles.quickIconRow}><View style={[styles.quickIcon, styles.nearIcon]}><NativeIcon ios="mappin.and.ellipse" android="place" color="#008875" size={20} /></View><NativeIcon ios={appDirection === "rtl" ? "chevron.left" : "chevron.right"} android={appDirection === "rtl" ? "chevron_left" : "chevron_right"} color={colors.textMuted} size={12} /></View>}

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
              <Link href={guideRoute} asChild>
                <PrimaryButton compact style={StyleSheet.flatten([styles.quickAction, { flex: 0, width: textLayout.quickWidth }])} tone="secondary"
                  label={t.ask} labelStyle={[styles.quickLabel, appDirection === "rtl" && { textAlign: "right" }]} contentStyle={styles.quickContent} wrapLabel
                  leadingIcon={<View style={styles.quickIconRow}><View style={styles.quickIcon}><NativeIcon ios="bubble.left" android="chat_bubble_outline" color={colors.primary} size={20} /></View><NativeIcon ios={appDirection === "rtl" ? "chevron.left" : "chevron.right"} android={appDirection === "rtl" ? "chevron_left" : "chevron_right"} color={colors.textMuted} size={12} /></View>} />
              </Link>
            </View>
            {locationMessage ? (
              <StatusMessage>{locationMessage}</StatusMessage>
            ) : null}
            {tours.length > 0 ? (
              <View style={styles.section}>
                <AppText accessibilityRole="header" style={styles.sectionTitle}>{t.suggested}</AppText>
                {suggestedTours.map((tour) => (
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
              <View style={styles.aboutCard} testID="city-about-card">
                <PressableSurface
                  accessibilityRole="button"
                  accessibilityLabel={`${locale === "de" ? "Über" : locale === "es" ? "Sobre" : locale === "nl" ? "Over" : locale === "ar" ? "عن" : "About"} ${nativeCityName(city.slug, city.content.name, locale)}`}
                  accessibilityState={{ expanded: aboutExpanded }}
                  onPress={() => setAboutExpanded((current) => !current)}
                  style={StyleSheet.flatten([styles.aboutTrigger, nativeRowStyle(appDirection)])}
                >
                  <NativeIcon ios="info.circle" android="info_outline" size={21} color={colors.primary} />
                  <View style={styles.aboutTitleArea}>
                    <AppText variant="label" style={styles.aboutTitle}>
                      {`${locale === "de" ? "Über" : locale === "es" ? "Sobre" : locale === "nl" ? "Over" : locale === "ar" ? "عن" : "About"} ${nativeCityName(city.slug, city.content.name, locale)}`}
                    </AppText>
                  </View>
                  <NativeIcon ios={aboutExpanded ? "chevron.up" : "chevron.down"} android={aboutExpanded ? "keyboard_arrow_up" : "keyboard_arrow_down"} size={19} color={colors.textMuted} />
                </PressableSurface>
                {aboutExpanded ? (
                  <AppText style={styles.aboutBody}>{city.content.description}</AppText>
                ) : null}
              </View>
            ) : null}
            <View
              style={styles.section}
              onLayout={(event) => {
                placesOffset.current =
                  headerOffset.current + event.nativeEvent.layout.y;
                setMeasuredPlacesOffset(placesOffset.current);
              }}
            >
              <AppText accessibilityRole="header" style={styles.sectionTitle}>{messages.places}</AppText>
              <View style={[styles.placeControls, !textLayout.expanded && styles.inlineControls]}>
                <View style={styles.categoryControls}>
                <WalkChoices
                  label={messages.places}
                  showHeading={false}
                  variant="chips"
                  compact
                  cityHub
                  options={(["all", "see", "eat", "fun"] as const).map(
                    (value) => ({ value, label: labels[value] }),
                  )}
                  selected={[category]}
                  onSelect={setCategory}
                />
                </View>
                <View style={styles.mapControls}>
                <WalkChoices
                  label={messages.map}
                  showHeading={false}
                  variant="segment"
                  compact
                  cityHub
                  options={[
                    { value: "list", label: labels.list },
                    { value: "map", label: labels.map },
                  ]}
                  selected={[mapVisible ? "map" : "list"]}
                  onSelect={(value) => setMapVisible(value === "map")}
                />
                </View>
              </View>
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
  const bundled = !image ? cityHubBundledPhoto(citySlug, firstPlace?.slug ?? "") : undefined;
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
          accessibilityLabel={`${nativeArabicDisplayText(tour.content.title, uiLocale)} · ${tour.estimatedDurationMinutes ? `${tour.estimatedDurationMinutes} ${messages.minutes} · ` : ""}${tour.stops.length} ${messages.stops} · ${stopNames.join(" · ")}`}
          onPress={() => {
            void triggerCitywalkHaptic("medium");
          }}
          style={StyleSheet.flatten([styles.tourLink, nativeRowStyle(appDirection), expanded && { flexDirection: "column" }])}
        >
          {imageUrl || bundled ? (
            <Image
              source={bundled?.source ?? { uri: citywalkApi.resolveUrl(imageUrl!) }}
              fallbackSource={
                firstPlace?.image
                  ? { uri: citywalkApi.resolveUrl(firstPlace.image) }
                  : undefined
              }
              cachePolicy="memory-disk"
              contentFit="cover"
              style={[styles.tourImage, expanded && { width: "100%", minHeight: 0, height: 160 }]}
              accessibilityLabel={nativeArabicDisplayText(tour.content.title, uiLocale)}
              transition={motion.component}
            />
          ) : null}
          <View style={[styles.tourContent, nativeTextBlock(appDirection), expanded && { flex: 0, width: "100%" }]}>
            <AppText variant="cardTitle" style={[styles.editorialCardTitle, textStyle]}>
              {nativeArabicDisplayText(tour.content.title, uiLocale)}
            </AppText>
            <AppText variant="metadata" style={styles.metadata}>
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
            {tour.content.shortDescription ? <AppText numberOfLines={expanded ? undefined : 3} variant="metadata" style={[styles.routeDescription, textStyle]}>{nativeArabicDisplayText(tour.content.shortDescription, uiLocale)}</AppText> : null}
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
      {bundled ? <View pointerEvents="box-none" style={[styles.tourPhotoCredit, expanded && { width: "100%" }]}><CityPhotoCredits cityName={nativePlaceName(citySlug, firstPlace!.slug, firstPlace!.content.name, uiLocale)} photo={bundled.credit} /></View> : null}
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
  const bundled = !imageMedia ? cityHubBundledPhoto(citySlug, place.slug) : undefined;
  const { messages } = useNativeLocale();
  const direction = getNativeDirection(locale);
  const textStyle = nativeContentTextStyle(locale, place.resolvedLocale);
  const [walkFeedback, setWalkFeedback] = useState({ message: "", customize: false });
  return (
    <View style={styles.placeCard}>
      <View style={[styles.placeCardRow, nativeRowStyle(direction)]}>
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
              source={bundled?.source ?? (image ? { uri: citywalkApi.resolveUrl(image) } : undefined)}
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
            <AppText numberOfLines={2} variant="cardTitle" style={styles.placeTitle}>
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
      <View style={styles.cardActions}><WalkMembershipControl citySlug={citySlug} placeSlug={place.slug} iconOnly onFeedback={(message, customize) => setWalkFeedback({ message, customize })} /></View>
      </View>
      {walkFeedback.message ? (
        <View style={[styles.placeFeedback, nativeRowStyle(direction)]}>
          <NativeIcon ios="info.circle" android="info_outline" color={colors.textMuted} size={16} />
          <AppText variant="caption" accessibilityLiveRegion="polite" numberOfLines={2} style={styles.placeFeedbackText}>
            {walkFeedback.customize
              ? locale === "de" ? "Passt nicht in deine Gehzeit." : locale === "es" ? "No cabe en el tiempo disponible." : locale === "nl" ? "Past niet binnen je wandeltijd." : locale === "da" ? "Passer ikke til din gåtid." : locale === "sv" ? "Ryms inte inom din promenadtid." : locale === "ar" ? "لا يناسب الوقت المتاح." : "Doesn't fit your walk time."
              : walkFeedback.message}
          </AppText>
          {walkFeedback.customize ? (
            <Link href={{ pathname: "/city/[citySlug]/walk", params: { citySlug } }} asChild>
              <PressableSurface accessibilityRole="link" style={styles.placeCustomize}>
                <AppText variant="caption" style={styles.placeCustomizeText}>{walkCopy(locale).customize}</AppText>
                <NativeIcon ios="arrow.up.right" android="north_east" color={colors.primary} size={13} />
              </PressableSurface>
            </Link>
          ) : null}
        </View>
      ) : null}
      {bundled ? <View pointerEvents="box-none" style={styles.placePhotoCredit}><CityPhotoCredits cityName={nativePlaceName(citySlug, place.slug, place.content.name, locale)} photo={bundled.credit} /></View> : null}
      {imageMedia?.attribution ? <View style={styles.cardAttribution}>
        <MediaAttribution attribution={imageMedia.attribution} />
      </View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hubContent: { paddingTop: 4 },
  headerContent: { gap: 8 },
  primaryShell: { borderRadius: 18, overflow: "hidden", backgroundColor: "#155CAF", boxShadow: "0px 5px 14px rgba(21,92,175,0.14)" },
  sectionTitle: { fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", fontSize: 23, lineHeight: 29, color: "#09234D", fontWeight: "700", letterSpacing: -0.5 },
  editorialCardTitle: { fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", fontSize: 18, lineHeight: 22, fontWeight: "700", letterSpacing: -0.4 },
  routeDescription: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  quickContent: { alignItems: "stretch", gap: 4 },
  quickLabel: { textAlign: "left", fontSize: 10.5, lineHeight: 15, fontWeight: "600", color: "#09234D" },
  quickIconRow: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  quickIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#E6F2FF", alignItems: "center", justifyContent: "center" },
  nearIcon: { backgroundColor: "#E5F7F3" },
  tourPhotoCredit: { position: "absolute", top: 0, left: 0, width: "40%", height: 64 },
  placePhotoCredit: { position: "absolute", top: 0, left: 0, width: 100, height: 64 },
  placeTitle: { fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", fontSize: 19, lineHeight: 24, fontWeight: "700" },
  buildMyWalk: { backgroundColor: "transparent", borderRadius: 16, minHeight: 48 },
  quickActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  quickAction: {
    flex: 1,
    minWidth: 0,
    minHeight: 64,
    borderRadius: 17,
    borderColor: "#DCE6F0",
    paddingHorizontal: 10,
    boxShadow: "0px 5px 18px rgba(9,35,77,0.035)",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: {
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    fontSize: 10,
    lineHeight: 14,
  },
  cityHero: {
    width: "100%",
    height: 235,
    borderRadius: radius.hero,
    backgroundColor: colors.primarySoft,
  },
  cityIntroduction: { gap: spacing.sm },
  section: { gap: 10 },
  aboutCard: { backgroundColor: colors.surface, borderRadius: 16, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  aboutTrigger: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  aboutTitleArea: { flex: 1, minWidth: 0, gap: 2 },
  aboutTitle: { color: colors.text },
  aboutBody: { color: colors.textMuted, lineHeight: 23, paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  placeControls: { gap: spacing.sm },
  inlineControls: { flexDirection: "row", alignItems: "center" },
  categoryControls: { flex: 1.3, minWidth: 0 },
  mapControls: { flex: 1, minWidth: 0 },
  placeImage: {
    width: "37%",
    minHeight: 150,
    alignSelf: "stretch",
    backgroundColor: colors.primarySoft,
  },
  placeThumbnail: {
    backgroundColor: "#EAF2F8",
    width: 100,
    height: 112,
    flexShrink: 0,
    borderRadius: 14,
  },
  placeCard: {
    backgroundColor: colors.surface,
    borderRadius: 19,
    borderColor: "#DFE8EE",
    borderWidth: 1,
    marginBottom: spacing.sm,
    overflow: "hidden",
  },
  placeCardRow: { flexDirection: "row", alignItems: "flex-start", padding: 10, gap: 4 },
  placeLink: {
    alignItems: "flex-start", flexDirection: "row",
    flex: 1, minWidth: 0, minHeight: 98, gap: 10,
  },
  placeContent: {
    flex: 1,
    gap: 3,
    minWidth: 0,
    paddingVertical: 2,
  },
  metadata: { color: colors.textMuted, marginTop: spacing.xs },
  muted: { color: colors.textMuted },
  description: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  tourCard: {
    backgroundColor: colors.surface,
    borderColor: "#DCE6F0",
    borderRadius: 18,
    boxShadow: "0px 5px 20px rgba(9,35,77,0.04)",
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  tourLink: { overflow: "hidden", flexDirection: "row", padding: 5 },
  tourImage: {
    width: "40%",
    minHeight: 156,
    borderRadius: 12,
    alignSelf: "stretch",
    backgroundColor: colors.primarySoft,
  },
  tourContent: { flex: 1, minWidth: 0, gap: 3, padding: 8 },
  cardActions: { width: 44, flexShrink: 0, alignSelf: "flex-start" },
  placeFeedback: { paddingHorizontal: 12, paddingBottom: 10, gap: 6, flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  placeFeedbackText: { color: colors.textMuted, fontSize: 12, lineHeight: 17, flexShrink: 1 },
  placeCustomize: { flexDirection: "row", alignItems: "center", gap: 3, minHeight: 38, paddingHorizontal: 4 },
  placeCustomizeText: { color: colors.primary, fontWeight: "700" },
  cardAttribution: { paddingBottom: spacing.sm, paddingHorizontal: spacing.md },
  fallback: { color: colors.violet, marginTop: spacing.xs },
  stopName: { color: colors.textMuted, marginTop: spacing.xs },
  startTour: { color: colors.primary, flexShrink: 1 },
  startTourRow: { alignItems: "center", flexDirection: "row", gap: spacing.xs, marginTop: spacing.xs, backgroundColor: colors.primarySoft, borderRadius: 22, minHeight: 32, paddingHorizontal: 12, paddingVertical: 6 },
});
