import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, StyleSheet, TextInput, View } from "react-native";

import { AppText, Card, PrimaryButton, Screen, SectionTitle, StatusMessage } from "../../../../components/ui";
import { CitywalkLoading } from "../../../../components/CitywalkLoading";
import { colors, radius, spacing, typography } from "../../../../design/tokens";
import { useGuideEligibility, usePublicPlace } from "../../../../hooks/usePublicContent";
import type { GuideAnswerResponse } from "../../../../lib/api/contracts";
import { CitywalkApiError } from "../../../../lib/api/client";
import { citywalkApi } from "../../../../lib/api/instance";
import { parsePlaceRouteIdentity } from "../../../../lib/routing";
import { useNativeLocale } from "../../../../localization/LocaleProvider";

export default function GuideScreen() {
  const params = useLocalSearchParams<{
    citySlug?: string | string[];
    placeSlug?: string | string[];
  }>();
  const identity = parsePlaceRouteIdentity(params.citySlug, params.placeSlug);
  const { direction, locale, messages } = useNativeLocale();
  const placeState = usePublicPlace(
    identity?.citySlug ?? "invalid",
    identity?.placeSlug ?? "invalid",
    locale,
  );
  const guideState = useGuideEligibility(
    identity?.citySlug ?? "invalid",
    identity?.placeSlug ?? "invalid",
  );
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<GuideAnswerResponse>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  if (!identity) return <Screen><StatusMessage>{messages.unavailable}</StatusMessage></Screen>;
  if (placeState.status === "loading" || guideState.status === "loading") {
    return <Screen><CitywalkLoading /></Screen>;
  }
  if (placeState.status === "error" || guideState.status === "error") {
    return <Screen><StatusMessage>{messages.guideUnavailable}</StatusMessage></Screen>;
  }

  const place = placeState.data.place;
  if (
    placeState.data.city.slug !== identity.citySlug ||
    place.slug !== identity.placeSlug ||
    !guideState.data.eligible
  ) {
    return <Screen><StatusMessage>{messages.guideUnavailable}</StatusMessage></Screen>;
  }
  const { citySlug, placeSlug } = identity;

  async function submitQuestion() {
    const cleanQuestion = question.trim();
    if (!cleanQuestion || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      setResult(await citywalkApi.askGuide({
        citySlug,
        placeSlug,
        locale,
        question: cleanQuestion,
      }));
    } catch (requestError) {
      setResult(undefined);
      setError(requestError instanceof CitywalkApiError && requestError.status === 429
        ? messages.guideRateLimited
        : messages.guideError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: messages.askGuideTitle }} />
      <View style={{ direction }}>
        <AppText variant="title">{messages.askGuideTitle}</AppText>
        <AppText variant="heading">{place.content.name}</AppText>
      </View>
      <TextInput
        accessibilityLabel={messages.questionPlaceholder}
        editable={!busy}
        multiline
        onChangeText={setQuestion}
        placeholder={messages.questionPlaceholder}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, {
          writingDirection: direction,
          textAlign: direction === "rtl" ? "right" : "left",
        }]}
        value={question}
      />
      <PrimaryButton
        label={messages.sendQuestion}
        busy={busy}
        disabled={!question.trim()}
        onPress={() => void submitQuestion()}
      />
      {error ? <StatusMessage>{error}</StatusMessage> : null}
      {result ? (
        <View>
          <SectionTitle>{messages.answer}</SectionTitle>
          <Card>
            <AppText>{result.answer}</AppText>
          </Card>
          {result.sources.length > 0 ? (
            <View>
              <SectionTitle>{messages.sources}</SectionTitle>
              {result.sources.map((source) => (
                <Pressable
                  accessibilityLabel={source.label}
                  accessibilityRole="link"
                  key={`${source.placeSlug}-${source.url}`}
                  onPress={() => void Linking.openURL(source.url)}
                  style={({ pressed }) => [styles.source, pressed && styles.sourcePressed]}
                >
                  <AppText variant="label" style={styles.sourceText}>{source.label}</AppText>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 120,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.text,
    backgroundColor: colors.surface,
    padding: spacing.md,
    textAlignVertical: "top",
    ...typography.body,
  },
  source: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  sourcePressed: { backgroundColor: "#EEF2FF" },
  sourceText: { color: colors.primary },
});
