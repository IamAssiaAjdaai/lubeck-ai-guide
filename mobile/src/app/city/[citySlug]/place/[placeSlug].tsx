import { t as translate } from "@citywalk/i18n";
import {
  nativeContentTextStyle,
  nativeRowStyle,
  nativeTextBlock,
} from "../../../../design/rtlPresentation";
import { ContentRecovery } from "../../../../components/ContentRecovery";
import { WalkMembershipControl } from "../../../../components/WalkMembershipControl";
import { nativePlaceName } from "../../../../lib/displayNames";
import { discoveryCopy } from "../../../../design/discoveryCopy";
import { walkCopy } from "@citywalk/traveler-core/walkCopy";
import { loadSavedPlaces, toggleSavedPlace } from "../../../../lib/walkStorage";
import { NativeContentImage as Image } from "../../../../components/NativeContentImage";
import { Link, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Linking, Platform, ScrollView, StyleSheet, View } from "react-native";

import { NativeAudioPlayer } from "../../../../components/NativeAudioPlayer";
import { MediaAttribution } from "../../../../components/MediaAttribution";
import { CitywalkLoading } from "../../../../components/CitywalkLoading";
import { NativeIcon } from "../../../../components/NativeIcon";
import { TripProgress } from "../../../../components/TripProgress";
import {
  AppText,
  EmptyState,
  MotionView,
  PressableSurface,
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

function formatVerifiedDate(locale: string, value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(timestamp);
  } catch {
    return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(timestamp);
  }
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
    if (
      offset === undefined ||
      contentOffset.current === undefined ||
      !scroll.current ||
      focusedSection.current === focus
    )
      return;
    scroll.current?.scrollTo({
      y: contentOffset.current + offset,
      animated: true,
    });
    focusedSection.current = focus;
  }, [params.focus]);
  useFocusEffect(
    useCallback(() => {
      focusSection();
      return () => {
        focusedSection.current = undefined;
      };
    }, [focusSection]),
  );
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
  const [savingPlace, setSavingPlace] = useState(false);
  const [tripCompleted, setTripCompleted] = useState(false);
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
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
        <ContentRecovery
          retry={placeState.retry}
          citySlug={identity.citySlug}
        />
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
  const directionsUrl =
    Platform.OS === "ios"
      ? `https://maps.apple.com/?daddr=${place.coordinates.lat},${place.coordinates.lng}&dirflg=w`
      : `https://www.google.com/maps/dir/?api=1&destination=${place.coordinates.lat},${place.coordinates.lng}&travelmode=walking`;
  const contentTextStyle = nativeContentTextStyle(
    locale,
    place.resolvedLocale,
  );
  const imageMedia = selectPrimaryImageMedia(place.media);
  const image = selectImageUrl(
    imageMedia,
    place.image,
    place.imageVariants,
    "detail",
  );
  const audio = selectExactLocaleAudio(place.media, locale);
  const hasStory = Boolean(place.content.story?.trim());
  const verifiedSources = placeState.data.verifiedSources ?? [];
  const latestVerifiedAt = verifiedSources.reduce<string | undefined>(
    (latest, source) =>
      !latest || Date.parse(source.verifiedAt) > Date.parse(latest)
        ? source.verifiedAt
        : latest,
    undefined,
  );
  const previousStop = trip ? adjacentMobileTripParams(trip, -1) : undefined;
  const nextStop = trip ? adjacentMobileTripParams(trip, 1) : undefined;

  return (
    <Screen scrollViewRef={scroll} navigation={false}>
      <Stack.Screen
        options={{
          title: nativePlaceName(
            identity.citySlug,
            place.slug,
            place.content.name,
            locale,
          ),
        }}
      />
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
      <MotionView
        duration={motion.screen}
        style={styles.content}
        onLayout={(event) => {
          contentOffset.current = event.nativeEvent.layout.y;
          focusSection();
        }}
      >
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
              accessibilityLabel={nativePlaceName(
                identity.citySlug,
                place.slug,
                place.content.name,
                locale,
              )}
              transition={motion.component}
            />
            <MediaAttribution attribution={imageMedia?.attribution} />
          </View>
        ) : null}
        <View style={[styles.introduction, nativeTextBlock(direction)]}>
          <AppText variant="metadata" style={styles.eyebrow}>
            {discoveryCopy(locale)[place.category]} · {place.durationMinutes}{" "}
            {messages.visitMinutes}
          </AppText>
          <View style={[styles.titleRow, nativeRowStyle(direction)]}>
            <AppText variant="screenTitle" style={styles.placeTitle}>
              {nativePlaceName(
                identity.citySlug,
                place.slug,
                place.content.name,
                locale,
              )}
            </AppText>
            <PressableSurface
              accessibilityLabel={translate(
                locale,
                saved ? "common.saved" : "common.save",
              )}
              accessibilityRole="button"
              accessibilityState={{
                selected: saved,
                busy: savingPlace,
                disabled: savingPlace,
              }}
              disabled={savingPlace}
              style={styles.saveAction}
              onPress={() => {
                if (savingPlace) return;
                setSavingPlace(true);
                void toggleSavedPlace({
                  citySlug: identity.citySlug,
                  slug: place.slug,
                  name: place.content.name,
                })
                  .then(setSaved)
                  .catch(() => setSaveMessage(messages.tripSaveFailed))
                  .finally(() => setSavingPlace(false));
              }}
            >
              <NativeIcon
                ios={saved ? "heart.fill" : "heart"}
                android={saved ? "favorite" : "favorite_border"}
                color={colors.primary}
                size={21}
              />
            </PressableSurface>
          </View>
          {direction === "rtl" && place.didFallback ? (
            <AppText variant="caption">{messages.fallbackContent}</AppText>
          ) : null}
        </View>
        <View style={[styles.quickActions, nativeRowStyle(direction)]}>
          <View style={styles.quickAction}>
            <WalkMembershipControl
              citySlug={identity.citySlug}
              placeSlug={place.slug}
              dense
              compact
            />
          </View>
          <PrimaryButton
            compact
            label={translate(locale, "place.directions")}
            tone="secondary"
            style={styles.directionAction}
            leadingIcon={
              <NativeIcon
                ios="location"
                android="directions"
                color={colors.primary}
                size={19}
              />
            }
            onPress={() => {
              void Linking.openURL(directionsUrl).catch(() =>
                setSaveMessage(messages.unavailable),
              );
            }}
          />
        </View>
        <View
          testID="place-audio-section"
          onLayout={(event) => {
            sections.current.audio = event.nativeEvent.layout.y;
            focusSection();
          }}
        >
          {audio ? (
            <NativeAudioPlayer
              key={`${identity.citySlug}:${place.slug}:${locale}`}
              source={citywalkApi.resolveUrl(audio.url)}
              title={`${nativePlaceName(
                identity.citySlug,
                place.slug,
                place.content.name,
                locale,
              )} ${messages.audioGuide}`}
              durationSeconds={audio.durationSeconds}
              assetLocale={audio.locale}
            />
          ) : (
            <View style={[styles.audioNotice, nativeTextBlock(direction)]}>
              <AppText variant="label">{messages.audioGuide}</AppText>
              <View testID="audio-unavailable-notice">
                <AppText variant="metadata" style={styles.muted}>
                  {translate(locale, "place.audioMissingDescription")}
                </AppText>
              </View>
            </View>
          )}
        </View>
        <View style={styles.section}>
          <SectionTitle>{translate(locale, "place.whyItMatters")}</SectionTitle>
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
            <AppText style={contentTextStyle}>{place.content.visitNote}</AppText>
          </View>
        ) : null}
        {hasStory ? (
          <View
            testID="place-story-section"
            style={styles.section}
            onLayout={(event) => {
              sections.current.story = event.nativeEvent.layout.y;
              focusSection();
            }}
          >
            <SectionTitle>{messages.story}</SectionTitle>
            <AppText style={contentTextStyle}>{place.content.story}</AppText>
          </View>
        ) : null}
        {place.content.facts?.length ? (
          <View style={styles.factsList}>
            <SectionTitle>{translate(locale, "place.quickFacts")}</SectionTitle>
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
        {verifiedSources.length ? (
          <View style={styles.verifiedCard}>
            <View style={styles.verifiedHeader}>
              <View style={styles.verifiedBadge}>
                <NativeIcon
                  ios="checkmark.shield.fill"
                  android="verified"
                  color={colors.teal}
                  size={20}
                />
              </View>
              <View style={styles.verifiedCopy}>
                <AppText variant="cardTitle">{t.verified}</AppText>
                <AppText variant="metadata" style={styles.muted}>
                  {translate(locale, "place.verifiedSummary")}
                </AppText>
              </View>
            </View>
            {latestVerifiedAt ? (
              <AppText variant="metadata" style={styles.muted}>
                {t.lastChecked}: {formatVerifiedDate(locale, latestVerifiedAt)}
              </AppText>
            ) : null}
            <PressableSurface
              accessibilityLabel={translate(
                locale,
                sourcesExpanded ? "place.hideSources" : "place.viewSources",
              )}
              accessibilityRole="button"
              accessibilityState={{ expanded: sourcesExpanded }}
              onPress={() => setSourcesExpanded((current) => !current)}
              style={styles.sourcesToggle}
            >
              <AppText variant="label" style={styles.sourcesToggleText}>
                {translate(
                  locale,
                  sourcesExpanded ? "place.hideSources" : "place.viewSources",
                )}
              </AppText>
              <NativeIcon
                ios={sourcesExpanded ? "chevron.up" : "chevron.down"}
                android={
                  sourcesExpanded ? "keyboard_arrow_up" : "keyboard_arrow_down"
                }
                color={colors.textMuted}
                size={17}
              />
            </PressableSurface>
            {sourcesExpanded ? (
              <MotionView style={styles.sourceList}>
                {verifiedSources.map((source) => (
                  <PressableSurface
                    key={source.url}
                    accessibilityLabel={source.label}
                    accessibilityRole="link"
                    onPress={() => {
                      void Linking.openURL(source.url).catch(() =>
                        setSaveMessage(messages.unavailable),
                      );
                    }}
                    style={styles.sourceRow}
                  >
                    <View style={styles.sourceCopy}>
                      <AppText variant="label">{source.label}</AppText>
                      <AppText variant="metadata" style={styles.muted}>
                        {t.lastChecked}: {formatVerifiedDate(locale, source.verifiedAt)}
                      </AppText>
                    </View>
                    <NativeIcon
                      ios="arrow.up.right"
                      android="open_in_new"
                      color={colors.primary}
                      size={17}
                    />
                  </PressableSurface>
                ))}
              </MotionView>
            ) : null}
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
            <PressableSurface
              accessibilityLabel={messages.askCitywalk}
              accessibilityRole="link"
              style={StyleSheet.flatten([
                styles.askAction,
                nativeRowStyle(direction),
              ])}
            >
              <View style={styles.askIcon}>
                <NativeIcon
                  ios="sparkles"
                  android="auto_awesome"
                  color={colors.primary}
                  size={18}
                />
              </View>
              <AppText variant="label" style={styles.askLabel}>
                {messages.askCitywalk}
              </AppText>
              <NativeIcon
                ios={direction === "rtl" ? "chevron.left" : "chevron.right"}
                android={
                  direction === "rtl" ? "chevron_left" : "chevron_right"
                }
                color={colors.textMuted}
                size={17}
              />
            </PressableSurface>
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
                        ios={
                          direction === "rtl" ? "arrow.right" : "arrow.left"
                        }
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
                        ios={
                          direction === "rtl" ? "arrow.left" : "arrow.right"
                        }
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
  audioNotice: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 2,
    paddingVertical: spacing.sm,
  },
  content: { gap: spacing.md },
  hero: {
    width: "100%",
    height: 240,
    borderRadius: radius.hero,
    backgroundColor: colors.primarySoft,
  },
  introduction: { gap: spacing.sm },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  placeTitle: { flex: 1, minWidth: 0 },
  saveAction: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  quickActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  quickAction: { flexBasis: 160, flexGrow: 1, minWidth: 0 },
  directionAction: { flexBasis: 132, flexGrow: 1, minHeight: 44 },
  description: { color: colors.textMuted },
  eyebrow: { color: colors.primary, marginBottom: spacing.xs },
  muted: { color: colors.textMuted },
  section: { gap: spacing.sm },
  verifiedCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    padding: spacing.md,
  },
  verifiedHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  verifiedBadge: {
    alignItems: "center",
    backgroundColor: colors.tealSoft,
    borderRadius: radius.pill,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  verifiedCopy: { flex: 1, gap: spacing.xs, minWidth: 0 },
  sourcesToggle: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 40,
    paddingTop: spacing.sm,
  },
  sourcesToggleText: { color: colors.primary },
  sourceList: { gap: spacing.xs },
  sourceRow: {
    alignItems: "center",
    borderRadius: radius.sm,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 48,
    paddingVertical: spacing.xs,
  },
  sourceCopy: { flex: 1, gap: spacing.xs, minWidth: 0 },
  askAction: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 54,
    paddingVertical: spacing.sm,
  },
  askIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  askLabel: { color: colors.primary, flex: 1, minWidth: 0 },
  note: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    gap: spacing.sm,
    padding: spacing.md,
  },
  noteHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
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