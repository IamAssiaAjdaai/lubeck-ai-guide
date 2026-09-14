import { Image } from "expo-image";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";

import { NativeAudioPlayer } from "../../../../components/NativeAudioPlayer";
import { MediaAttribution } from "../../../../components/MediaAttribution";
import { CitywalkLoading } from "../../../../components/CitywalkLoading";
import { NativeIcon } from "../../../../components/NativeIcon";
import { AppText, Card, PrimaryButton, Screen, SectionTitle, StatusMessage } from "../../../../components/ui";
import { colors, radius, spacing } from "../../../../design/tokens";
import { useGuideEligibility, usePublicPlace } from "../../../../hooks/usePublicContent";
import { citywalkApi } from "../../../../lib/api/instance";
import {
  selectExactLocaleAudio,
  selectImageUrl,
  selectPrimaryImageMedia,
} from "../../../../lib/api/media";
import { getNativeDirection, getNativeTextAlignment } from "../../../../lib/localization";
import { parsePlaceRouteIdentity } from "../../../../lib/routing";
import { useNativeLocale } from "../../../../localization/LocaleProvider";

export default function PlaceScreen() {
  const params = useLocalSearchParams<{ citySlug?: string | string[]; placeSlug?: string | string[] }>();
  const identity = parsePlaceRouteIdentity(params.citySlug, params.placeSlug);
  const { locale, messages } = useNativeLocale();
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
  if (placeState.status === "loading") return <Screen><CitywalkLoading /></Screen>;
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

  return (
    <Screen>
      <Stack.Screen options={{ title: place.content.name }} />
      {image ? (
        <View>
          <Image
            source={{ uri: citywalkApi.resolveUrl(image) }}
            cachePolicy="memory-disk"
            contentFit="cover"
            style={styles.hero}
            accessibilityLabel={place.content.name}
          />
          <MediaAttribution attribution={imageMedia?.attribution} />
        </View>
      ) : null}
      <View style={{ direction: contentDirection }}>
        <AppText variant="caption" style={styles.eyebrow}>{place.category.toUpperCase()} · {place.durationMinutes} {messages.visitMinutes}</AppText>
        <AppText variant="title" style={contentTextStyle}>{place.content.name}</AppText>
        <AppText style={contentTextStyle}>{place.content.description ?? place.content.shortDescription}</AppText>
      </View>
      {place.content.visitNote ? (
        <Card>
          <SectionTitle>{messages.visitorNote}</SectionTitle>
          <AppText style={contentTextStyle}>{place.content.visitNote}</AppText>
        </Card>
      ) : null}
      {place.content.story ? (
        <View>
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
            <Card key={`${place.slug}-fact-${index}`}>
              {fact.label ? (
                <AppText variant="label" style={contentTextStyle}>
                  {fact.label}
                </AppText>
              ) : null}
              <AppText style={contentTextStyle}>{fact.value}</AppText>
            </Card>
          ))}
        </View>
      ) : null}
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
          />
        </Link>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { width: "100%", height: 250, borderRadius: radius.lg, backgroundColor: "#EEF2FF" },
  eyebrow: { color: colors.primary, marginBottom: spacing.sm },
  factsList: { gap: spacing.sm },
});
