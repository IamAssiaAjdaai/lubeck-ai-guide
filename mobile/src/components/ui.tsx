import { useEffect, useState, type PropsWithChildren, type ReactNode, type Ref } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type FlatListProps,
  type StyleProp,
  type TextProps,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, motion, radius, spacing, typography } from "../design/tokens";
import { triggerCitywalkHaptic, type CitywalkHaptic } from "../lib/haptics";
import { useReducedMotion } from "../lib/motion";
import { getScreenSafeAreaEdges, SCREEN_TOP_SPACING } from "../lib/screenLayout";
import { useNativeLocale } from "../localization/LocaleProvider";

export function Screen({
  children,
  includeTopSafeArea = false,
  scrollViewRef,
}: PropsWithChildren<{
  includeTopSafeArea?: boolean;
  scrollViewRef?: Ref<ScrollView>;
}>) {
  const { direction } = useNativeLocale();
  return (
    <SafeAreaView
      style={[styles.safeArea, { direction }]}
      edges={getScreenSafeAreaEdges(includeTopSafeArea)}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.screenContent}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function VirtualizedScreen<T>({
  includeTopSafeArea = false,
  contentContainerStyle,
  ...props
}: FlatListProps<T> & { includeTopSafeArea?: boolean }) {
  const { direction } = useNativeLocale();
  return (
    <SafeAreaView
      style={[styles.safeArea, { direction }]}
      edges={getScreenSafeAreaEdges(includeTopSafeArea)}
    >
      <FlatList
        {...props}
        contentContainerStyle={[styles.screenContent, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}

export function AppText({
  variant = "body",
  style,
  ...props
}: TextProps & { variant?: keyof typeof typography }) {
  const { direction } = useNativeLocale();
  return (
    <Text
      {...props}
      style={[
        styles.text,
        typography[variant],
        { writingDirection: direction, textAlign: direction === "rtl" ? "right" : "left" },
        style,
      ]}
    />
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function PressableSurface({
  style,
  pressedStyle,
  ...props
}: Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  pressedStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [styles.pressableSurface, style, pressed && styles.pressableSurfacePressed, pressed && pressedStyle]}
    />
  );
}

export function PrimaryButton({
  label,
  busy = false,
  leadingIcon,
  trailingIcon,
  tone = "primary",
  haptic,
  onPress,
  ...props
}: PressableProps & {
  label: string;
  busy?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  tone?: "primary" | "secondary" | "ai" | "success";
  haptic?: CitywalkHaptic;
}) {
  const buttonTone = tone === "secondary"
    ? styles.secondaryButton
    : tone === "ai"
      ? styles.aiButton
      : tone === "success"
        ? styles.successButton
        : undefined;
  const textTone = tone === "secondary" ? styles.secondaryButtonText : styles.buttonText;
  return (
    <Pressable
      accessibilityRole="button"
      {...props}
      disabled={busy || props.disabled}
      onPress={(event) => {
        if (haptic) void triggerCitywalkHaptic(haptic);
        onPress?.(event);
      }}
      style={(state) => [
        styles.primaryButton,
        buttonTone,
        state.pressed && styles.primaryButtonPressed,
        (busy || props.disabled) && styles.disabled,
        typeof props.style === "function" ? props.style(state) : props.style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={tone === "secondary" ? colors.primary : "#FFFFFF"} />
      ) : (
        <View style={styles.buttonContent}>
          {leadingIcon}
          <Text numberOfLines={1} adjustsFontSizeToFit style={textTone}>{label}</Text>
          {trailingIcon}
        </View>
      )}
    </Pressable>
  );
}

export function MotionView({
  children,
  style,
  distance = 10,
  duration = motion.component,
  ...props
}: PropsWithChildren<Omit<ViewProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  distance?: number;
  duration?: number;
}>) {
  const reducedMotion = useReducedMotion();
  const [opacity] = useState(() => new Animated.Value(reducedMotion ? 1 : 0));
  const [translateY] = useState(() => new Animated.Value(reducedMotion ? 0 : distance));

  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, { duration, toValue: 1, useNativeDriver: true }),
      Animated.timing(translateY, { duration, toValue: 0, useNativeDriver: true }),
    ]).start();
  }, [duration, opacity, reducedMotion, translateY]);

  return (
    <Animated.View {...props} style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

export function EmptyState({
  action,
  description,
  icon,
  title,
}: Readonly<{
  action?: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
}>) {
  return (
    <View style={styles.emptyState}>
      <View accessibilityElementsHidden style={styles.emptyIcon}>{icon}</View>
      <AppText variant="heading" style={styles.emptyTitle}>{title}</AppText>
      <AppText style={styles.emptyDescription}>{description}</AppText>
      {action}
    </View>
  );
}

export function InlineLoadingDots() {
  const reducedMotion = useReducedMotion();
  const [opacity] = useState(() => new Animated.Value(0.35));

  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(1);
      return;
    }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { duration: 420, toValue: 1, useNativeDriver: true }),
      Animated.timing(opacity, { duration: 420, toValue: 0.35, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [opacity, reducedMotion]);

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.loadingDots}>
      {[0, 1, 2].map((dot) => (
        <Animated.View key={dot} style={[styles.loadingDot, { opacity }]} />
      ))}
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <AppText variant="heading" style={styles.sectionTitle}>{children}</AppText>;
}

export function StatusMessage({
  children,
  tone = "info",
}: { children: ReactNode; tone?: "info" | "success" | "error" }) {
  return (
    <View accessibilityRole="alert" style={[
      styles.status,
      tone === "success" && styles.statusSuccess,
      tone === "error" && styles.statusError,
    ]}>
      <AppText>{children}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  screenContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: SCREEN_TOP_SPACING,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  text: { color: colors.text },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: "#171717",
    shadowOpacity: 0.045,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  pressableSurface: { minHeight: 44 },
  pressableSurfacePressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  primaryButton: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonPressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  secondaryButton: { backgroundColor: colors.primarySoft },
  aiButton: { backgroundColor: colors.violet },
  successButton: { backgroundColor: colors.success },
  buttonText: { color: "#FFFFFF", ...typography.label },
  secondaryButtonText: { color: colors.primary, ...typography.label },
  buttonContent: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  disabled: { opacity: 0.55 },
  sectionTitle: { marginTop: spacing.sm },
  status: { borderRadius: radius.md, backgroundColor: "#EEF2FF", padding: spacing.md },
  statusSuccess: { backgroundColor: colors.successSoft },
  statusError: { backgroundColor: colors.dangerSoft },
  emptyState: {
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  emptyIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  emptyTitle: { textAlign: "center" },
  emptyDescription: { color: colors.textMuted, maxWidth: 300, textAlign: "center" },
  loadingDots: { alignItems: "center", flexDirection: "row", gap: 4 },
  loadingDot: { backgroundColor: colors.primary, borderRadius: 4, height: 6, width: 6 },
});
