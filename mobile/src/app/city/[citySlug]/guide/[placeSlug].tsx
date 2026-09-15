import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
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
import { AppText, EmptyState, InlineLoadingDots, MotionView, Screen, StatusMessage } from "../../../../components/ui";
import { colors, radius, spacing, typography } from "../../../../design/tokens";
import { useGuideEligibility, usePublicPlace } from "../../../../hooks/usePublicContent";
import type { GuideAllowance, GuideSource } from "../../../../lib/api/contracts";
import { CitywalkApiError } from "../../../../lib/api/client";
import { citywalkApi } from "../../../../lib/api/instance";
import {
  appendGuideAnswer,
  createGuideWelcome,
  startGuideTurn,
  type GuideConversationMessage,
} from "../../../../lib/guideConversation";
import { guideConversationStore } from "../../../../lib/guideConversationStorage";
import { canSubmitGuideQuestion, classifyGuideFailure, isGuideAllowanceExhausted, type GuideFailure } from "../../../../lib/guideFailure";
import { guideUpgradePath } from "../../../../lib/guideUpgrade";
import { parsePlaceRouteIdentity } from "../../../../lib/routing";
import { triggerCitywalkHaptic } from "../../../../lib/haptics";
import { getScreenSafeAreaEdges, SCREEN_TOP_SPACING } from "../../../../lib/screenLayout";
import { useNativeLocale } from "../../../../localization/LocaleProvider";

export default function GuideScreen() {
  const params = useLocalSearchParams<{
    citySlug?: string | string[];
    placeSlug?: string | string[];
  }>();
  const router = useRouter();
  const identity = parsePlaceRouteIdentity(params.citySlug, params.placeSlug);
  const identityCitySlug = identity?.citySlug;
  const identityPlaceSlug = identity?.placeSlug;
  const conversationKey = identityCitySlug && identityPlaceSlug
    ? `${identityCitySlug}:${identityPlaceSlug}` : "";
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
  const [failure, setFailure] = useState<GuideFailure>();
  const [hydratedKey, setHydratedKey] = useState("");
  const hydrated = Boolean(conversationKey && hydratedKey === conversationKey);
  const [busy, setBusy] = useState(false);
  const messageSequence = useRef(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    let active = true;
    if (!identityCitySlug || !identityPlaceSlug) return () => { active = false; };
    void guideConversationStore.load(identityCitySlug, identityPlaceSlug).then((stored) => {
      if (!active) return;
      setAllowance(undefined);
      setFailure(undefined);
      setQuestion("");
      setConversation([createGuideWelcome(messages.guideWelcome), ...stored]);
      setHydratedKey(`${identityCitySlug}:${identityPlaceSlug}`);
    });
    return () => { active = false; };
  }, [identityCitySlug, identityPlaceSlug, messages.guideWelcome]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: conversation.length > 1 });
  }, [busy, conversation]);

  if (!identity) return <Screen><StatusMessage>{messages.unavailable}</StatusMessage></Screen>;
  if (placeState.status === "loading" || guideState.status === "loading") {
    return <Screen><CitywalkLoading variant="place" /></Screen>;
  }
  if (placeState.status === "error" || guideState.status === "error") {
    return (
      <Screen>
        <EmptyState
          description={messages.guideUnavailable}
          icon={<NativeIcon ios="sparkles" android="auto_awesome" color={colors.violet} size={28} />}
          title={messages.askGuideTitle}
        />
      </Screen>
    );
  }

  const place = placeState.data.place;
  if (
    placeState.data.city.slug !== identity.citySlug ||
    place.slug !== identity.placeSlug ||
    !guideState.data.eligible
  ) {
    return (
      <Screen>
        <EmptyState
          description={messages.guideUnavailable}
          icon={<NativeIcon ios="sparkles" android="auto_awesome" color={colors.violet} size={28} />}
          title={messages.askGuideTitle}
        />
      </Screen>
    );
  }
  const { citySlug, placeSlug } = identity;

  if (!hydrated) return <Screen><CitywalkLoading variant="place" /></Screen>;

  const canSend = canSubmitGuideQuestion({ busy, hydrated, allowance, failure, question });

  function nextMessageId(role: "user" | "assistant"): string {
    const existing = new Set(conversation.map(({ id }) => id));
    let id: string;
    do {
      messageSequence.current += 1;
      id = `${role}-${messageSequence.current}`;
    } while (existing.has(id));
    return id;
  }

  async function submitQuestion() {
    if (!canSend) return;
    const turn = startGuideTurn(conversation, question, nextMessageId("user"));
    if (!turn) return;

    setConversation(turn.messages);
    setQuestion("");
    setFailure(undefined);
    setBusy(true);
    void triggerCitywalkHaptic("light");
    try {
      const result = await citywalkApi.askGuide({
        citySlug,
        placeSlug,
        locale,
        question: turn.question,
        history: turn.history,
      });
      setAllowance(result.allowance);
      const completed = appendGuideAnswer(turn.messages, {
        id: nextMessageId("assistant"),
        text: result.answer,
        sources: result.sources,
      });
      setConversation(completed);
      void guideConversationStore.save(citySlug, placeSlug, completed);
    } catch (requestError) {
      const apiError = requestError instanceof CitywalkApiError ? requestError : undefined;
      if (apiError?.allowance) setAllowance(apiError.allowance);
      setConversation(conversation);
      setQuestion(turn.question);
      setFailure(classifyGuideFailure(requestError));
      void triggerCitywalkHaptic("error");
    } finally {
      setBusy(false);
    }
  }

  const limitReached = isGuideAllowanceExhausted(allowance) || failure === "daily_allowance";
  const upgradePath = allowance?.tier === "free" ? guideUpgradePath(citySlug, locale) : undefined;
  const sendDisabled = !canSend;

  return (
    <SafeAreaView edges={getScreenSafeAreaEdges(false)} style={[styles.safeArea, { direction }]}>
      <Stack.Screen options={{ title: messages.askGuideTitle }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
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
                sourcesCountLabel={messages.sourceCount.replace("{count}", String(message.sources?.length ?? 0))}
              />
            ))}
            {busy ? (
              <View
                accessibilityLabel={messages.guideThinking}
                accessibilityLiveRegion="polite"
                accessibilityRole="progressbar"
                style={[styles.bubble, styles.assistantBubble, styles.thinkingBubble]}
              >
                <InlineLoadingDots />
                <AppText variant="caption" style={styles.thinkingText}>{messages.guideThinking}</AppText>
              </View>
            ) : null}
            {limitReached ? (
              <View accessibilityLiveRegion="polite" style={styles.limitCard}>
                <AppText variant="heading" style={styles.limitTitle}>
                  {allowance?.tier === "premium" ? messages.guidePremiumLimitTitle : messages.guideFreeLimitTitle}
                </AppText>
                <AppText style={styles.limitDescription}>
                  {allowance?.tier === "premium"
                    ? messages.guidePremiumLimitBody.replace("{count}", String(allowance.limit))
                    : allowance
                      ? messages.guideFreeLimitBody.replace("{count}", String(allowance.limit))
                      : messages.guideRateLimited}
                </AppText>
                {upgradePath ? (
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => void Linking.openURL(citywalkApi.resolveUrl(upgradePath))}
                    style={({ pressed }) => [styles.upgradeButton, pressed && styles.sendButtonPressed]}
                  >
                    <AppText variant="label" style={styles.upgradeText}>{messages.guideUnlockPass}</AppText>
                  </Pressable>
                ) : null}
                <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.maybeLaterButton}>
                  <AppText variant="caption" style={styles.limitFootnote}>{messages.guideMaybeLater}</AppText>
                </Pressable>
              </View>
            ) : failure ? (
              <View accessibilityLiveRegion="polite" style={styles.retryNotice}>
                <AppText style={styles.retryText}>
                  {failure === "abuse_limit" ? messages.guideAbuseLimited : messages.guideError}
                </AppText>
              </View>
            ) : null}
          </View>
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            accessibilityLabel={messages.questionPlaceholder}
            editable={!busy && hydrated && !limitReached}
            multiline
            onChangeText={setQuestion}
            onSubmitEditing={() => void submitQuestion()}
            placeholder={messages.questionPlaceholder}
            placeholderTextColor={colors.textMuted}
            returnKeyType="send"
            submitBehavior="submit"
            style={[styles.input, {
              writingDirection: direction,
              textAlign: direction === "rtl" ? "right" : "left",
            }]}
            value={question}
          />
          <Pressable
            accessibilityLabel={messages.sendQuestion}
            accessibilityRole="button"
            disabled={sendDisabled}
            onPress={() => void submitQuestion()}
            style={({ pressed }) => [
              styles.sendButton,
              pressed && styles.sendButtonPressed,
              sendDisabled && styles.sendButtonDisabled,
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
  sourcesCountLabel,
  sourcesLabel,
}: Readonly<{
  direction: "ltr" | "rtl";
  message: GuideConversationMessage;
  sourcesCountLabel: string;
  sourcesLabel: string;
}>) {
  const isUser = message.role === "user";
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const bubble = (
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
          <Pressable
            accessibilityLabel={sourcesCountLabel}
            accessibilityRole="button"
            accessibilityState={{ expanded: sourcesExpanded }}
            onPress={() => {
              void triggerCitywalkHaptic("light");
              setSourcesExpanded((current) => !current);
            }}
            style={({ pressed }) => [styles.sourcesToggle, pressed && styles.sourcePressed]}
          >
            <NativeIcon ios="checkmark.shield" android="verified" color={colors.teal} size={16} />
            <AppText variant="caption" style={styles.sourcesTitle}>{sourcesCountLabel}</AppText>
            <NativeIcon
              ios={sourcesExpanded ? "chevron.up" : "chevron.down"}
              android={sourcesExpanded ? "keyboard_arrow_up" : "keyboard_arrow_down"}
              color={colors.textMuted}
              size={16}
            />
          </Pressable>
          {sourcesExpanded ? (
            <MotionView style={styles.sourceList}>
              <AppText variant="caption" style={styles.sourceListTitle}>{sourcesLabel}</AppText>
              {message.sources.map((source) => (
                <GuideSourceLink key={`${message.id}-${source.placeSlug}-${source.url}`} source={source} />
              ))}
            </MotionView>
          ) : null}
        </View>
      ) : null}
    </View>
  );
  return isUser ? bubble : <MotionView>{bubble}</MotionView>;
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
  limitCard: { backgroundColor: colors.primarySoft, borderColor: colors.border, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, gap: spacing.sm, padding: spacing.md },
  limitTitle: { color: colors.primary },
  limitDescription: { color: colors.text },
  limitFootnote: { color: colors.textMuted },
  maybeLaterButton: { alignItems: "center", minHeight: 40, justifyContent: "center" },
  upgradeButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, minHeight: 48, justifyContent: "center", paddingHorizontal: spacing.md },
  upgradeText: { color: "#FFFFFF" },
  retryNotice: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md },
  retryText: { color: colors.textMuted },
  sources: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  sourcesToggle: { alignItems: "center", flexDirection: "row", gap: spacing.xs, minHeight: 36 },
  sourcesTitle: { color: colors.textMuted, flex: 1 },
  sourceList: { gap: spacing.xs },
  sourceListTitle: { color: colors.textSubtle },
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
  sendButtonPressed: { backgroundColor: colors.primaryPressed, transform: [{ scale: 0.96 }] },
  sendButtonDisabled: { opacity: 0.45 },
});
