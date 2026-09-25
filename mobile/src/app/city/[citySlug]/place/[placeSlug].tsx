import { walkCopy } from "@citywalk/traveler-core/walkCopy";
import { loadSavedPlaces, toggleSavedPlace } from "../../../../lib/walkStorage";
import { NativeContentImage as Image } from "../../../../components/NativeContentImage";
import { Link, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";

import { NativeAudioPlayer } from "../../../../components/NativeAudioPlayer";
import { MediaAttribution } from "../../../../components/MediaAttribution";
import { CitywalkLoading } from "../../../../components/CitywalkLoading";
import { NativeIcon } from "../../../../components/NativeIcon";
import { TripProgress } from "../../../../components/TripProgress";
import {
  AppText,
  EmptyState,
  MotionView,
  PrimaryButton,
  Screen,
  SectionTitle,
  StatusMessage,
} from "../../../../components/ui";
import { colors, motion, radius, spacing } from "../../../../design/tokens";
import {
  useGuideEligibility,
  usePublicPlace,
} from "../../../../hooks/usePublicContent";
import { citywalkApi } from "../../../../lib/api/instance";
import {
  selectExactLocaleAudio,
  selectImageUrl,
  selectPrimaryImageMedia,
} from "../../../../lib/api/media";
import {
  getNativeDirection,
  getNativeTextAlignment,
} from "../../../../lib/localization";
import { parsePlaceRouteIdentity } from "../../../../lib/routing";
import {
  adjacentMobileTripParams,
  parseMobileTripContext,
} from "../../../../lib/tripNavigation";
import { useNativeLocale } from "../../../../localization/LocaleProvider";

export default function PlaceScreen() {
  const { citySlug, placeSlug } = useLocalSearchParams();
  // A different place must not inherit local audio, completion or scroll state.
  return <PlaceContent key={`${citySlug}:${placeSlug}`} />;
}

function PlaceContent() {
  const params = useLocalSearchParams<{
    citySlug?: string | string[];
    placeSlug?: string | string[];
    focus?: string;
    tripVersion?: string | string[];
    tripId?: string | string[];
    tripStops?: string | string[];
    tripIndex?: string | string[];
    tripSource?: string | string[];
  }>();
  const scroll = useRef<ScrollView>(null);
  const contentOffset = useRef<number | undefined>(undefined);
  const sections = useRef<{ story?: number; audio?: number }>({});
  const focusedSection = useRef<string | undefined>(undefined);
  const focusSection = useCallback(() => {
    const focus = params.focus;
    if (focus !== "audio" && focus !== "story") return;
    const offset = sections.current[focus];
    if (offset === undefined || contentOffset.current === undefined || !scroll.current || focusedSection.current === focus) return;
    scroll.current?.scrollTo({ y: contentOffset.current + offset, animated: true });
    focusedSection.current = focus;
  }, [params.focus]);
  useFocusEffect(useCallback(() => {
    focusSection();
    return () => { focusedSection.current = undefined; };
  }, [focusSection]));
  const identity = parsePlaceRouteIdentity(params.citySlug, params.placeSlug);
  const trip = parseMobileTripContext(params);
  const { direction, locale, messages } = useNativeLocale();
  const t = walkCopy(locale);
  const [saved, setSaved] = useState(false),
    [saveMessage, setSaveMessage] = useState("");
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void loadSavedPlaces()
        .then((items) => {
          if (alive)
            setSaved(
              items.some(
                (p) =>
                  p.citySlug === params.citySlug && p.slug === params.placeSlug,
              ),
            );
        })
        .catch(() => {
          if (alive) setSaveMessage(messages.tripSaveFailed);
        });
      return () => {
        alive = false;
      };
    }, [
      params.citySlug,
      params.placeSlug,
      messages.tripSaveFailed,
      setSaveMessage,
      setSaved,
    ]),
  );
  const [tripCompleted, setTripCompleted] = useState(false);
  const placeState = usePublicPlace(
    identity?.citySlug ?? "invalid",
    identity?.placeSlug ?? "invalid",
    locale,
  );
  const guideState = useGuideEligibility(
    identity?.citySlug ?? "invalid",
    identity?.placeSlug ?? "invalid",
  );

  if (!identity)
    return (
      <Screen>
        <StatusMessage>{messages.unavailable}</StatusMessage>
      </Screen>
    );
  if (placeState.status === "loading")
    return (
      <Screen>
        <CitywalkLoading variant="place" />
      </Screen>
    );
  if (placeState.status === "error")
    return (
      <Screen>
        <StatusMessage>{messages.unavailable}</StatusMessage>
      </Screen>
    );

  const place = placeState.data.place;
  if (
    placeState.data.city.slug !== identity.citySlug ||
    place.slug !== identity.placeSlug
  ) {
    return (
      <Screen>
        <StatusMessage>{messages.unavailable}</StatusMessage>
      </Screen>
    );
  }
  const contentDirection = getNativeDirection(place.resolvedLocale);
  const contentTextStyle = {
    writingDirection: contentDirection,
    textAlign: getNativeTextAlignment(place.resolvedLocale),
  } as const;
  const imageMedia = selectPrimaryImageMedia(place.media);
  const image = selectImageUrl(
    imageMedia,
    place.image,
    place.imageVariants,
    "detail",
  );
  const audio = selectExactLocaleAudio(place.media, locale);
  const previousStop = trip ? adjacentMobileTripParams(trip, -1) : undefined;
  const nextStop = trip ? adjacentMobileTripParams(trip, 1) : undefined;

  return (
    <Screen scrollViewRef={scroll}>
      <Stack.Screen options={{ title: place.content.name }} />
      {saveMessage ? <StatusMessage>{saveMessage}</StatusMessage> : null}
      {trip ? (
        <TripProgress
          current={trip.currentStopIndex + 1}
          label={messages.stopProgress
            .replace("{current}", String(trip.currentStopIndex + 1))
            .replace("{total}", String(trip.stopSlugs.length))}
          total={trip.stopSlugs.length}
        />
      ) : null}
      <MotionView duration={motion.screen} style={styles.content} onLayout={(event) => {
        contentOffset.current = event.nativeEvent.layout.y;
        focusSection();
      }}>
        {image ? (
          <View>
            <Image
              source={{ uri: citywalkApi.resolveUrl(image) }}
              fallbackSource={
                place.image
                  ? { uri: citywalkApi.resolveUrl(place.image) }
                  : undefined
              }
              cachePolicy="memory-disk"
              contentFit="cover"
              style={styles.hero}
              accessibilityLabel={place.content.name}
              transition={motion.component}
            />
            <MediaAttribution attribution={imageMedia?.attribution} />
          </View>
        ) : null}
        <View style={[styles.introduction, { direction: contentDirection }]}>
          <AppText variant="metadata" style={styles.eyebrow}>
            {place.category.toUpperCase()} · {place.durationMinutes}{" "}
            {messages.visitMinutes}
          </AppText>
          <AppText variant="screenTitle" style={contentTextStyle}>
            {place.content.name}
          </AppText>
          <AppText style={[contentTextStyle, styles.description]}>
            {place.content.description ?? place.content.shortDescription}
          </AppText>
        </View>
        {place.content.visitNote ? (
          <View style={styles.note}>
            <View style={styles.noteHeading}>
              <NativeIcon
                ios="info.circle"
                android="info"
                color={colors.primary}
                size={19}
              />
              <AppText variant="label" style={styles.noteTitle}>
                {messages.visitorNote}
              </AppText>
            </View>
            <AppText style={contentTextStyle}>
              {place.content.visitNote}
            </AppText>
          </View>
        ) : null}
        {place.content.story ? (
          <View style={styles.section} onLayout={(event) => {
            sections.current.story = event.nativeEvent.layout.y;
            focusSection();
          }}>
            <SectionTitle>{messages.story}</SectionTitle>
            <AppText style={contentTextStyle}>{place.content.story}</AppText>
          </View>
        ) : null}
        <PrimaryButton
          label={`${t.saved}${saved ? " ✓" : ""}`}
          accessibilityState={{ selected: saved }}
          tone="secondary"
          onPress={() => {
            void toggleSavedPlace({
              citySlug: identity.citySlug,
              slug: place.slug,
              name: place.content.name,
            })
              .then(setSaved)
              .catch(() => setSaveMessage(messages.tripSaveFailed));
          }}
        />
        <Link
          href={{
            pathname: "/city/[citySlug]/walk",
            params: { citySlug: identity.citySlug, add: place.slug },
          }}
          asChild
        >
          <PrimaryButton label={t.addToWalk} />
        </Link>
        {audio ? (
          <View
            onLayout={(event) => {
              sections.current.audio = event.nativeEvent.layout.y;
              focusSection();
            }}
          >
            <NativeAudioPlayer
              key={`${identity.citySlug}:${place.slug}:${locale}`}
              source={citywalkApi.resolveUrl(audio.url)}
              title={`${place.content.name} ${messages.audioGuide}`}
              durationSeconds={audio.durationSeconds}
            />
          </View>
        ) : null}
        {!audio && params.focus === "audio" ? <StatusMessage>{messages.audioUnavailable}</StatusMessage> : null}
        {place.content.facts?.length ? (
          <View style={styles.factsList}>
            <SectionTitle>{messages.facts}</SectionTitle>
            {place.content.facts.map((fact, index) => (
              <View key={`${place.slug}-fact-${index}`} style={styles.fact}>
                {fact.label ? (
                  <AppText variant="label" style={contentTextStyle}>
                    {fact.label}
                  </AppText>
                ) : null}
                <AppText style={contentTextStyle}>{fact.value}</AppText>
              </View>
            ))}
          </View>
        ) : null}
        {placeState.data.verifiedSources?.length ? (
          <View style={styles.section}>
            <SectionTitle>{t.verified}</SectionTitle>
            <AppText>{t.verifiedHelp}</AppText>
            {placeState.data.verifiedSources.map((source) => (
              <PrimaryButton
                key={source.url}
                tone="secondary"
                label={`${source.label} · ${t.lastChecked}: ${source.verifiedAt}`}
                onPress={() => {
                  void Linking.openURL(source.url).catch(() =>
                    setSaveMessage(messages.unavailable),
                  );
                }}
              />
            ))}
          </View>
        ) : null}
        {guideState.status === "available" && guideState.data.eligible ? (
          <Link
            href={{
              pathname: "/city/[citySlug]/guide/[placeSlug]",
              params: {
                citySlug: identity.citySlug,
                placeSlug: identity.placeSlug,
              },
            }}
            asChild
          >
            <PrimaryButton
              label={messages.askCitywalk}
              leadingIcon={
                <NativeIcon
                  ios="sparkles"
                  android="auto_awesome"
                  color="#FFFFFF"
                  size={19}
                />
              }
              haptic="medium"
              tone="ai"
            />
          </Link>
        ) : null}
        {trip && !tripCompleted ? (
          <View style={styles.tripPanel}>
            <AppText variant="caption" style={styles.tripNextContext}>
              {nextStop ? messages.nextStop : messages.finishTrip}
            </AppText>
            <View style={styles.tripActions}>
              {previousStop ? (
                <Link
                  href={{
                    pathname: "/city/[citySlug]/place/[placeSlug]",
                    params: previousStop,
                  }}
                  replace
                  asChild
                >
                  <PrimaryButton
                    haptic="light"
                    label={messages.previousStop}
                    leadingIcon={
                      <NativeIcon
                        ios={direction === "rtl" ? "arrow.right" : "arrow.left"}
                        android={
                          direction === "rtl" ? "arrow_forward" : "arrow_back"
                        }
                        color={colors.primary}
                        size={18}
                      />
                    }
                    style={styles.tripAction}
                    tone="secondary"
                  />
                </Link>
              ) : null}
              {nextStop ? (
                <Link
                  href={{
                    pathname: "/city/[citySlug]/place/[placeSlug]",
                    params: nextStop,
                  }}
                  replace
                  asChild
                >
                  <PrimaryButton
                    haptic="light"
                    label={messages.nextStop}
                    style={styles.tripAction}
                    trailingIcon={
                      <NativeIcon
                        ios={direction === "rtl" ? "arrow.left" : "arrow.right"}
                        android={
                          direction === "rtl" ? "arrow_back" : "arrow_forward"
                        }
                        color="#FFFFFF"
                        size={18}
                      />
                    }
                  />
                </Link>
              ) : (
                <PrimaryButton
                  haptic="success"
                  label={messages.finishTrip}
                  onPress={() => setTripCompleted(true)}
                  style={styles.tripAction}
                  tone="success"
                />
              )}
            </View>
          </View>
        ) : null}
        {trip && tripCompleted ? (
          <MotionView>
            <EmptyState
              action={
                <Link
                  href={{
                    pathname: "/city/[citySlug]",
                    params: { citySlug: trip.citySlug },
                  }}
                  replace
                  asChild
                >
                  <PrimaryButton
                    label={messages.returnToCity}
                    tone="secondary"
                  />
                </Link>
              }
              description={messages.tripCompleteDescription.replace(
                "{count}",
                String(trip.stopSlugs.length),
              )}
              icon={
                <NativeIcon
                  ios="checkmark"
                  android="check"
                  color={colors.success}
                  size={30}
                />
              }
              title={messages.tripComplete}
            />
          </MotionView>
        ) : null}
      </MotionView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  hero: {
    width: "100%",
    height: 240,
    borderRadius: radius.hero,
    backgroundColor: colors.primarySoft,
  },
  introduction: { gap: spacing.sm },
  description: { color: colors.textMuted },
  eyebrow: { color: colors.primary, marginBottom: spacing.sm },
  section: { gap: spacing.sm },
  note: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    gap: spacing.sm,
    padding: spacing.md,
  },
  noteHeading: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  noteTitle: { color: colors.primary },
  factsList: { gap: 0 },
  fact: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  tripPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    gap: spacing.sm,
    padding: spacing.md,
  },
  tripNextContext: { color: colors.textMuted },
  tripActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tripAction: { flexBasis: "47%", flexGrow: 1 },
});
