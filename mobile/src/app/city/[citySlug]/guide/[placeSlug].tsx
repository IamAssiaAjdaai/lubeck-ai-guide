import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CitywalkLoading } from "../../../../components/CitywalkLoading";
import { NativeIcon } from "../../../../components/NativeIcon";
import { AppText, Screen, StatusMessage } from "../../../../components/ui";
import { colors, radius, spacing, typography } from "../../../../design/tokens";
import { useGuideEligibility, usePublicPlace } from "../../../../hooks/usePublicContent";
import type { GuideAllowance, GuideSource } from "../../../../lib/api/contracts";
import { CitywalkApiError } from "../../../../lib/api/client";
import { citywalkApi } from "../../../../lib/api/instance";
import {
  appendGuideAnswer,
  appendGuideError,
  createGuideWelcome,
  startGuideTurn,
  type GuideConversationMessage,
} from "../../../../lib/guideConversation";
import { parsePlaceRouteIdentity } from "../../../../lib/routing";
import { getScreenSafeAreaEdges, SCREEN_TOP_SPACING } from "../../../../lib/screenLayout";
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
  const [conversation, setConversation] = useState<readonly GuideConversationMessage[]>(() => [
    createGuideWelcome(messages.guideWelcome),
  ]);
  const [allowance, setAllowance] = useState<GuideAllowance>();
  const [busy, setBusy] = useState(false);
  const messageSequence = useRef(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: conversation.length > 1 });
  }, [busy, conversation]);

  if (!identity) return <Screen><StatusMessage>{messages.unavailable}</StatusMessage></Screen>;
  if (placeState.status === "loading" || guideState.status === "loading") {
    return <Screen><CitywalkLoading variant="place" /></Screen>;
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

  function nextMessageId(role: "user" | "assistant"): string {
    messageSequence.current += 1;
    return `${role}-${messageSequence.current}`;
  }

  async function submitQuestion() {
    if (busy) return;
    const turn = startGuideTurn(conversation, question, nextMessageId("user"));
    if (!turn) return;

    setConversation(turn.messages);
    setQuestion("");
    setBusy(true);
    try {
      const result = await citywalkApi.askGuide({
        citySlug,
        placeSlug,
        locale,
        question: turn.question,
        history: turn.history,
      });
      setAllowance(result.allowance);
      setConversation(appendGuideAnswer(turn.messages, {
        id: nextMessageId("assistant"),
        text: result.answer,
        sources: result.sources,
      }));
    } catch (requestError) {
      const apiError = requestError instanceof CitywalkApiError ? requestError : undefined;
      if (apiError?.allowance) setAllowance(apiError.allowance);
      const errorText = apiError?.code === "guide_daily_allowance_reached"
        ? messages.guideRateLimited
        : apiError?.code === "guide_abuse_rate_limited"
          ? messages.guideAbuseLimited
          : messages.guideError;
      setConversation(appendGuideError(turn.messages, {
        id: nextMessageId("assistant"),
        text: errorText,
      }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView edges={getScreenSafeAreaEdges(false)} style={[styles.safeArea, { direction }]}>
      <Stack.Screen options={{ title: messages.askGuideTitle }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.conversation}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          <View style={styles.guideHeader}>
            <View style={styles.guideIdentity}>
              <View style={styles.guideIcon}>
                <NativeIcon ios="sparkles" android="auto_awesome" color={colors.primary} size={18} />
              </View>
              <View style={styles.guideHeading}>
                <AppText variant="heading">{messages.askGuideTitle}</AppText>
                <AppText variant="caption" style={styles.placeName}>{place.content.name}</AppText>
              </View>
            </View>
            {allowance?.tier === "free" ? (
              <AppText accessibilityLiveRegion="polite" variant="caption" style={styles.allowance}>
                {allowance.remaining === 1
                  ? messages.guideQuestionRemaining
                  : messages.guideQuestionsRemaining.replace("{count}", String(allowance.remaining))}
              </AppText>
            ) : null}
          </View>

          <View style={styles.messages}>
            {conversation.map((message) => (
              <GuideMessageBubble
                direction={direction}
                key={message.id}
                message={message}
                sourcesLabel={messages.sources}
              />
            ))}
            {busy ? (
              <View
                accessibilityLabel={messages.guideThinking}
                accessibilityLiveRegion="polite"
                accessibilityRole="progressbar"
                style={[styles.bubble, styles.assistantBubble, styles.thinkingBubble]}
              >
                <ActivityIndicator color={colors.primary} size="small" />
                <AppText variant="caption" style={styles.thinkingText}>{messages.guideThinking}</AppText>
              </View>
            ) : null}
          </View>
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            accessibilityLabel={messages.questionPlaceholder}
            editable={!busy}
            multiline
            onChangeText={setQuestion}
            onSubmitEditing={() => void submitQuestion()}
            placeholder={messages.questionPlaceholder}
            placeholderTextColor={colors.textMuted}
            returnKeyType="send"
            style={[styles.input, {
              writingDirection: direction,
              textAlign: direction === "rtl" ? "right" : "left",
            }]}
            value={question}
          />
          <Pressable
            accessibilityLabel={messages.sendQuestion}
            accessibilityRole="button"
            disabled={busy || !question.trim()}
            onPress={() => void submitQuestion()}
            style={({ pressed }) => [
              styles.sendButton,
              pressed && styles.sendButtonPressed,
              (busy || !question.trim()) && styles.sendButtonDisabled,
            ]}
          >
            <NativeIcon ios="paperplane.fill" android="send" color="#FFFFFF" size={20} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function GuideMessageBubble({
  direction,
  message,
  sourcesLabel,
}: Readonly<{
  direction: "ltr" | "rtl";
  message: GuideConversationMessage;
  sourcesLabel: string;
}>) {
  const isUser = message.role === "user";
  return (
    <View style={[
      styles.bubble,
      isUser ? styles.userBubble : styles.assistantBubble,
      message.kind === "error" && styles.errorBubble,
      isUser
        ? { alignSelf: direction === "rtl" ? "flex-start" : "flex-end" }
        : { alignSelf: direction === "rtl" ? "flex-end" : "flex-start" },
    ]}>
      <AppText style={isUser ? styles.userText : undefined}>{message.text}</AppText>
      {message.sources?.length ? (
        <View style={styles.sources}>
          <AppText variant="caption" style={styles.sourcesTitle}>{sourcesLabel}</AppText>
          {message.sources.map((source) => (
            <GuideSourceLink key={`${message.id}-${source.placeSlug}-${source.url}`} source={source} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function GuideSourceLink({ source }: Readonly<{ source: GuideSource }>) {
  return (
    <Pressable
      accessibilityLabel={source.label}
      accessibilityRole="link"
      onPress={() => void Linking.openURL(source.url)}
      style={({ pressed }) => [styles.source, pressed && styles.sourcePressed]}
    >
      <AppText variant="caption" style={styles.sourceText}>{source.label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  keyboardView: { flex: 1 },
  conversation: {
    flexGrow: 1,
    gap: spacing.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: SCREEN_TOP_SPACING,
  },
  guideHeader: { gap: spacing.sm },
  guideIdentity: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  guideIcon: {
    alignItems: "center", backgroundColor: "#DBEAFE", borderRadius: radius.pill,
    height: 40, justifyContent: "center", width: 40,
  },
  guideHeading: { flex: 1 },
  placeName: { color: colors.textMuted },
  allowance: { color: colors.teal },
  messages: { flex: 1, gap: spacing.sm, justifyContent: "flex-end" },
  bubble: {
    borderRadius: radius.lg,
    gap: spacing.sm,
    maxWidth: "88%",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  assistantBubble: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomStartRadius: radius.sm,
  },
  userBubble: { backgroundColor: colors.primary, borderBottomEndRadius: radius.sm },
  userText: { color: "#FFFFFF" },
  errorBubble: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  thinkingBubble: { alignItems: "center", flexDirection: "row" },
  thinkingText: { color: colors.textMuted },
  sources: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  sourcesTitle: { color: colors.textMuted },
  source: { borderRadius: radius.sm, minHeight: 36, justifyContent: "center", paddingVertical: spacing.xs },
  sourcePressed: { opacity: 0.65 },
  sourceText: { color: colors.primary, textDecorationLine: "underline" },
  composer: {
    alignItems: "flex-end",
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.text,
    flex: 1,
    maxHeight: 112,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    textAlignVertical: "center",
    ...typography.body,
  },
  sendButton: {
    alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.pill,
    height: 48, justifyContent: "center", width: 48,
  },
  sendButtonPressed: { backgroundColor: colors.primaryPressed },
  sendButtonDisabled: { opacity: 0.45 },
});
