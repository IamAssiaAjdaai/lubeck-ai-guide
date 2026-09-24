import { walkCopy } from "@citywalk/traveler-core/walkCopy";
import { loadSavedPlaces, toggleSavedPlace } from "../../../../lib/walkStorage";
import { NativeContentImage as Image } from "../../../../components/NativeContentImage";
import { Link, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Linking, StyleSheet, View } from "react-native";

import { NativeAudioPlayer } from "../../../../components/NativeAudioPlayer";
import { MediaAttribution } from "../../../../components/MediaAttribution";
import { CitywalkLoading } from "../../../../components/CitywalkLoading";
import { NativeIcon } from "../../../../components/NativeIcon";
import { TripProgress } from "../../../../components/TripProgress";
import { AppText, EmptyState, MotionView, PrimaryButton, Screen, SectionTitle, StatusMessage } from "../../../../components/ui";
import { colors, motion, radius, spacing } from "../../../../design/tokens";
import { useGuideEligibility, usePublicPlace } from "../../../../hooks/usePublicContent";
import { citywalkApi } from "../../../../lib/api/instance";
import {
  selectExactLocaleAudio,
  selectImageUrl,
  selectPrimaryImageMedia,
} from "../../../../lib/api/media";
import { getNativeDirection, getNativeTextAlignment } from "../../../../lib/localization";
import { parsePlaceRouteIdentity } from "../../../../lib/routing";
import { adjacentMobileTripParams, parseMobileTripContext } from "../../../../lib/tripNavigation";
import { useNativeLocale } from "../../../../localization/LocaleProvider";

export default function PlaceScreen() {
  const params = useLocalSearchParams<{
    citySlug?: string | string[];
    placeSlug?: string | string[];
    tripVersion?: string | string[];
    tripId?: string | string[];
    tripStops?: string | string[];
    tripIndex?: string | string[];
    tripSource?: string | string[];
  }>();
  const identity = parsePlaceRouteIdentity(params.citySlug, params.placeSlug);
  const trip = parseMobileTripContext(params);
  const { direction, locale, messages } = useNativeLocale();
  const t = walkCopy(locale);
  const [saved, setSaved] = useState(false), [saveMessage, setSaveMessage] = useState("");
  useFocusEffect(useCallback(() => {
    let alive = true;
    void loadSavedPlaces().then(items => { if (alive) setSaved(items.some(p => p.citySlug === params.citySlug && p.slug === params.placeSlug)); }).catch(() => { if (alive) setSaveMessage(messages.tripSaveFailed); });
    return () => { alive = false; };
  }, [params.citySlug, params.placeSlug, messages.tripSaveFailed, setSaveMessage, setSaved]));
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

  if (!identity) return <Screen><StatusMessage>{messages.unavailable}</StatusMessage></Screen>;
  if (placeState.status === "loading") return <Screen><CitywalkLoading variant="place" /></Screen>;
  if (placeState.status === "error") return <Screen><StatusMessage>{messages.unavailable}</StatusMessage></Screen>;

  const place = placeState.data.place;
  if (placeState.data.city.slug !== identity.citySlug || place.slug !== identity.placeSlug) {
    return <Screen><StatusMessage>{messages.unavailable}</StatusMessage></Screen>;
  }
  const contentDirection = getNativeDirection(place.resolvedLocale);
  const contentTextStyle = {
    writingDirection: contentDirection,
    textAlign: getNativeTextAlignment(place.resolvedLocale),
  } as const;
  const imageMedia = selectPrimaryImageMedia(place.media);
  const image = selectImageUrl(imageMedia, place.image, place.imageVariants, "detail");
  const audio = selectExactLocaleAudio(place.media, locale);
  const previousStop = trip ? adjacentMobileTripParams(trip, -1) : undefined;
  const nextStop = trip ? adjacentMobileTripParams(trip, 1) : undefined;

  return (
    <Screen>
      <Stack.Screen options={{ title: place.content.name }} />
      {saveMessage ? <StatusMessage>{saveMessage}</StatusMessage> : null}
      <PrimaryButton label={`${t.saved}${saved ? " ✓" : ""}`} accessibilityState={{ selected: saved }} tone="secondary" onPress={() => { void toggleSavedPlace({ citySlug: identity.citySlug, slug: place.slug, name: place.content.name }).then(setSaved).catch(() => setSaveMessage(messages.tripSaveFailed)); }} />
      <Link href={{ pathname: "/city/[citySlug]/walk", params: { citySlug: identity.citySlug, add: place.slug } }} asChild><PrimaryButton label={t.addToWalk} /></Link>
      {trip ? (
        <TripProgress
          current={trip.currentStopIndex + 1}
          label={messages.stopProgress
            .replace("{current}", String(trip.currentStopIndex + 1))
            .replace("{total}", String(trip.stopSlugs.length))}
          total={trip.stopSlugs.length}
        />
      ) : null}
      <MotionView duration={motion.screen} style={styles.content}>
        {image ? (
          <View>
            <Image
              source={{ uri: citywalkApi.resolveUrl(image) }}
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
          <AppText variant="metadata" style={styles.eyebrow}>{place.category.toUpperCase()} · {place.durationMinutes} {messages.visitMinutes}</AppText>
          <AppText variant="screenTitle" style={contentTextStyle}>{place.content.name}</AppText>
          <AppText style={[contentTextStyle, styles.description]}>{place.content.description ?? place.content.shortDescription}</AppText>
        </View>
      {place.content.visitNote ? (
        <View style={styles.note}>
          <View style={styles.noteHeading}>
            <NativeIcon ios="info.circle" android="info" color={colors.primary} size={19} />
            <AppText variant="label" style={styles.noteTitle}>{messages.visitorNote}</AppText>
          </View>
          <AppText style={contentTextStyle}>{place.content.visitNote}</AppText>
        </View>
      ) : null}
      {place.content.story ? (
        <View style={styles.section}>
          <SectionTitle>{messages.story}</SectionTitle>
          <AppText style={contentTextStyle}>{place.content.story}</AppText>
        </View>
      ) : null}
      {audio ? (
        <NativeAudioPlayer
          source={citywalkApi.resolveUrl(audio.url)}
          title={`${place.content.name} ${messages.audioGuide}`}
          durationSeconds={audio.durationSeconds}
        />
      ) : null}
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
      {placeState.data.verifiedSources?.length ? <View style={styles.section}><SectionTitle>{t.verified}</SectionTitle><AppText>{t.verifiedHelp}</AppText>{placeState.data.verifiedSources.map(source => <PrimaryButton key={source.url} tone="secondary" label={`${source.label} · ${t.lastChecked}: ${source.verifiedAt}`} onPress={() => { void Linking.openURL(source.url).catch(() => setSaveMessage(messages.unavailable)); }} />)}</View> : null}
      {guideState.status === "available" && guideState.data.eligible ? (
        <Link
          href={{
            pathname: "/city/[citySlug]/guide/[placeSlug]",
            params: { citySlug: identity.citySlug, placeSlug: identity.placeSlug },
          }}
          asChild
        >
          <PrimaryButton
            label={messages.askCitywalk}
            leadingIcon={<NativeIcon ios="sparkles" android="auto_awesome" color="#FFFFFF" size={19} />}
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
                  href={{ pathname: "/city/[citySlug]/place/[placeSlug]", params: previousStop }}
                  replace
                  asChild
                >
                  <PrimaryButton
                    haptic="light"
                    label={messages.previousStop}
                    leadingIcon={<NativeIcon ios={direction === "rtl" ? "arrow.right" : "arrow.left"} android={direction === "rtl" ? "arrow_forward" : "arrow_back"} color={colors.primary} size={18} />}
                    style={styles.tripAction}
                    tone="secondary"
                  />
                </Link>
              ) : null}
              {nextStop ? (
                <Link
                  href={{ pathname: "/city/[citySlug]/place/[placeSlug]", params: nextStop }}
                  replace
                  asChild
                >
                  <PrimaryButton
                    haptic="light"
                    label={messages.nextStop}
                    style={styles.tripAction}
                    trailingIcon={<NativeIcon ios={direction === "rtl" ? "arrow.left" : "arrow.right"} android={direction === "rtl" ? "arrow_back" : "arrow_forward"} color="#FFFFFF" size={18} />}
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
              action={(
                <Link href={{ pathname: "/city/[citySlug]", params: { citySlug: trip.citySlug } }} replace asChild>
                  <PrimaryButton label={messages.returnToCity} tone="secondary" />
                </Link>
              )}
              description={messages.tripCompleteDescription.replace("{count}", String(trip.stopSlugs.length))}
              icon={<NativeIcon ios="checkmark" android="check" color={colors.success} size={30} />}
              title={messages.tripComplete}
            />
          </MotionView>
        ) : null}
      </MotionView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl },
  hero: { width: "100%", height: 270, borderRadius: radius.hero, backgroundColor: colors.primarySoft },
  introduction: { gap: spacing.sm },
  description: { color: colors.textMuted },
  eyebrow: { color: colors.primary, marginBottom: spacing.sm },
  section: { gap: spacing.sm },
  note: { backgroundColor: colors.primarySoft, borderRadius: radius.md, gap: spacing.sm, padding: spacing.md },
  noteHeading: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  noteTitle: { color: colors.primary },
  factsList: { gap: 0 },
  fact: { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, gap: spacing.xs, paddingVertical: spacing.md },
  tripPanel: { backgroundColor: colors.surface, borderRadius: radius.lg, gap: spacing.sm, padding: spacing.md },
  tripNextContext: { color: colors.textMuted },
  tripActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tripAction: { flexBasis: "47%", flexGrow: 1 },
});
