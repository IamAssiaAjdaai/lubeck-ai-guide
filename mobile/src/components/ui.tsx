import { arabicTextOverride, nativeHeadingStyle, nativeTextStyle } from "../design/rtlPresentation";
import { nativeArabicDisplayText } from "../lib/contentLabels";
import { isolateLatinRuns } from "../lib/bidi";
import {
  useEffect,
  useCallback,
  useRef,
  useImperativeHandle,
  useState,
  type PropsWithChildren,
  type ReactNode,
  type Ref,
} from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type PressableProps,
  type FlatListProps,
  type StyleProp,
  type TextProps,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { usePathname } from "expo-router";
import { NativeBrand, NativeBottomNavigation } from "./NativeChrome";
import { useRootTabScroll } from "../lib/tabNavigation";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  colors,
  layout,
  shadows,
  motion,
  radius,
  spacing,
  typography,
} from "../design/tokens";
import { triggerCitywalkHaptic, type CitywalkHaptic } from "../lib/haptics";
import { useReducedMotion } from "../lib/motion";
import {
  getScreenSafeAreaEdges,
  SCREEN_TOP_SPACING,
} from "../lib/screenLayout";
import { useNativeLocale } from "../localization/LocaleProvider";

export function Screen({
  children,
  includeTopSafeArea = true,
  scrollViewRef,
  footer,
  navigation,
  brand = true,
  onBack,
  scrollDiagnostics,
}: PropsWithChildren<{
  includeTopSafeArea?: boolean;
  scrollViewRef?: Ref<ScrollView>;
  footer?: ReactNode;
  navigation?: boolean;
  brand?: boolean;
  onBack?: () => void;
  scrollDiagnostics?: string;
}>) {
  const { direction } = useNativeLocale();
  const path = usePathname();
  const showNavigation = navigation ?? path === "/" || path === "/saved" || path === "/account";
  const { width } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);
  const scrollProbe = useRef({ y: 0, pending: false });
  useImperativeHandle(scrollViewRef, () => scroll.current!, []);
  const scrollToTop = useCallback((animated = true) => {
    if (__DEV__ && process.env.EXPO_PUBLIC_CITYWALK_QA_LOGS === "1" && scrollDiagnostics) {
      scrollProbe.current.pending = true;
      console.info(`[HOME_SCROLL] ref=${Boolean(scroll.current)} native=${Boolean(scroll.current?.getNativeScrollRef?.())} beforeY=${scrollProbe.current.y} action=scroll-top`);
    }
    scroll.current?.scrollTo({ y: 0, animated });
  }, [scrollDiagnostics]);
  useRootTabScroll(scrollToTop);
  return (
    <SafeAreaView
      style={[styles.safeArea, { direction }]}
      edges={getScreenSafeAreaEdges(includeTopSafeArea)}
    >
      {brand ? <NativeBrand onBack={onBack} /> : null}
      <ScrollView
        ref={scroll}
        style={{ direction }}
        contentContainerStyle={[
          styles.screenContent,
          width <= layout.smallPhone && styles.smallScreen,
        ]}
        onScroll={scrollDiagnostics && __DEV__ && process.env.EXPO_PUBLIC_CITYWALK_QA_LOGS === "1" ? event => {
          scrollProbe.current.y = event.nativeEvent.contentOffset.y;
          if (scrollProbe.current.pending && scrollProbe.current.y <= 1) {
            console.info(`[HOME_SCROLL] reached-top y=${scrollProbe.current.y}`);
            scrollProbe.current.pending = false;
          }
        } : undefined}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="on-drag"
      >
        {children}
      </ScrollView>
      {footer ? (
        <View
          style={[
            styles.footer,
            width <= layout.smallPhone && styles.smallScreen,
          ]}
        >
          {footer}
        </View>
      ) : null}
      {showNavigation ? {showNavigation ? <NativeBottomNavigation onScrollToTop={scrollToTop} /> : null} : null}
    </SafeAreaView>
  );
}

export function VirtualizedScreen<T>({
  includeTopSafeArea = true,
  contentContainerStyle,
  ListHeaderComponent,
  navigation,
  ref: listRef,
  ...props
}: FlatListProps<T> & {
  includeTopSafeArea?: boolean;
  navigation?: boolean;
  ref?: Ref<FlatList<T>>;
}) {
  const { direction } = useNativeLocale();
  const path = usePathname();
  const showNavigation = navigation ?? path === "/" || path === "/saved" || path === "/account";
  const { width } = useWindowDimensions();
  const list = useRef<FlatList<T>>(null);
  useImperativeHandle(listRef, () => list.current!, []);
  const scrollToTop = useCallback((animated = true) => list.current?.scrollToOffset({ offset: 0, animated }), []);
  useRootTabScroll(scrollToTop);
  return (
    <SafeAreaView
      style={[styles.safeArea, { direction }]}
      edges={getScreenSafeAreaEdges(includeTopSafeArea)}
    >
      <NativeBrand />
      <FlatList
        {...props}
        ref={list}
        style={[props.style, { direction }]}
        ListHeaderComponent={
          <>
            {typeof ListHeaderComponent === "function" ? (
              <ListHeaderComponent />
            ) : (
              ListHeaderComponent
            )}
          </>
        }
        contentContainerStyle={[
          styles.screenContent,
          width <= layout.smallPhone && styles.smallScreen,
          contentContainerStyle,
        ]}
        keyboardShouldPersistTaps="handled"
      />
      <NativeBottomNavigation onScrollToTop={scrollToTop} />
    </SafeAreaView>
  );
}

export function AppText({
  variant = "body",
  style,
  children,
  ...props
}: TextProps & { variant?: keyof typeof typography }) {
  const { locale, direction } = useNativeLocale();
  const parts = Array.isArray(children) ? children : [children];
  const text = parts.filter(child => typeof child === "string").join(" ");
  return (
    <Text
      {...props}
      style={[
        styles.text,
        typography[variant],
        direction === "rtl" && { letterSpacing: 0, lineHeight: typography[variant].lineHeight + 3 },
        nativeTextStyle(direction),
        style,
        arabicTextOverride(direction, text),
      ]}
    >
      {direction === "rtl"
        ? (Array.isArray(children) ? children : [children]).map(child => typeof child === "string" ? isolateLatinRuns(nativeArabicDisplayText(child, locale)) : child)
        : children}
    </Text>
  );
}

export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: ViewStyle }>) {
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
      style={({ pressed }) => [
        styles.pressableSurface,
        style,
        pressed && styles.pressableSurfacePressed,
        pressed && pressedStyle,
      ]}
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
  wrapLabel = true,
  compact = false,
  onPress,
  ...props
}: PressableProps & {
  label: string;
  busy?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  tone?: "primary" | "secondary" | "ai" | "success";
  haptic?: CitywalkHaptic;
  wrapLabel?: boolean;
  compact?: boolean;
}) {
  const { direction } = useNativeLocale();
  const buttonTone =
    tone === "secondary"
      ? styles.secondaryButton
      : tone === "ai"
        ? styles.aiButton
        : tone === "success"
          ? styles.successButton
          : undefined;
  const textTone =
    tone === "secondary" ? styles.secondaryButtonText : styles.buttonText;
  return (
    <Pressable
      accessibilityRole="button"
      {...props}
      accessibilityState={{ ...props.accessibilityState, busy, disabled: Boolean(busy || props.disabled) }}
      disabled={busy || props.disabled}
      onPress={(event) => {
        if (haptic) void triggerCitywalkHaptic(haptic);
        onPress?.(event);
      }}
      style={(state) => [
        styles.primaryButton,
        !compact && styles.textActionButton,
        buttonTone,
        compact && { paddingHorizontal: spacing.xs, paddingVertical: spacing.sm },
        state.pressed && styles.primaryButtonPressed,
        (busy || props.disabled) && styles.disabled,
        typeof props.style === "function" ? props.style(state) : props.style,
      ]}
    >
      <View style={[styles.buttonContent, { direction }, compact && styles.tileContent, compact && direction === "rtl" && { alignItems: "flex-start" }]}>
          {busy ? <ActivityIndicator color={tone === "secondary" ? colors.primary : "#FFFFFF"} /> : leadingIcon}
          <Text
            numberOfLines={wrapLabel ? undefined : 1}
            adjustsFontSizeToFit={false}
            style={[textTone, { writingDirection: direction, textAlign: "center", flexShrink: 1, minWidth: 0 }, compact && styles.tileLabel, direction === "rtl" && { lineHeight: compact ? 20 : 24 }, compact && direction === "rtl" && { textAlign: "right", alignSelf: "stretch" }]}
          >
            {direction === "rtl" ? isolateLatinRuns(label) : label}
          </Text>
          {trailingIcon}
      </View>
    </Pressable>
  );
}

export function MotionView({
  children,
  style,
  distance = 10,
  duration = motion.component,
  ...props
}: PropsWithChildren<
  Omit<ViewProps, "style"> & {
    style?: StyleProp<ViewStyle>;
    distance?: number;
    duration?: number;
  }
>) {
  const reducedMotion = useReducedMotion();
  const [opacity] = useState(() => new Animated.Value(reducedMotion ? 1 : 0));
  const [translateY] = useState(
    () => new Animated.Value(reducedMotion ? 0 : distance),
  );

  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, { duration, toValue: 1, useNativeDriver: true }),
      Animated.timing(translateY, {
        duration,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();
  }, [duration, opacity, reducedMotion, translateY]);

  return (
    <Animated.View
      {...props}
      style={[style, { opacity, transform: [{ translateY }] }]}
    >
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
  const { direction } = useNativeLocale();
  return (
    <View style={[styles.emptyState, { direction }]} >
      <View accessibilityElementsHidden style={styles.emptyIcon}>
        {icon}
      </View>
      <AppText variant="heading" style={[styles.emptyTitle, direction === "rtl" && { alignSelf: "stretch" }]}>
        {title}
      </AppText>
      <AppText style={[styles.emptyDescription, direction === "rtl" && { alignSelf: "stretch" }]}>{description}</AppText>
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
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          duration: 420,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          duration: 420,
          toValue: 0.35,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity, reducedMotion]);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.loadingDots}
    >
      {[0, 1, 2].map((dot) => (
        <Animated.View key={dot} style={[styles.loadingDot, { opacity }]} />
      ))}
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  const { direction } = useNativeLocale();
  return (
    <AppText accessibilityRole="header" variant="heading" style={[styles.sectionTitle, nativeHeadingStyle(direction)]}>
      {children}
    </AppText>
  );
}

export function StatusMessage({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "success" | "error";
}) {
  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.status,
        tone === "success" && styles.statusSuccess,
        tone === "error" && styles.statusError,
      ]}
    >
      <AppText>{children}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  screenContent: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: SCREEN_TOP_SPACING,
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  smallScreen: { paddingHorizontal: spacing.md },
  footer: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  text: { color: colors.text },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card,
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
  textActionButton: { alignSelf: "stretch", paddingVertical: spacing.sm },
  secondaryButton: { backgroundColor: colors.primarySoft },
  aiButton: { backgroundColor: colors.violet },
  successButton: { backgroundColor: colors.success },
  buttonText: { color: "#FFFFFF", ...typography.label },
  secondaryButtonText: { color: colors.primary, ...typography.label },
  buttonContent: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  tileContent: { flexDirection: "column", gap: spacing.sm, width: "100%" },
  tileLabel: { fontSize: 12, lineHeight: 16, textAlign: "center" },
  disabled: { opacity: 0.55 },
  sectionTitle: { marginTop: spacing.sm },
  status: {
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
  },
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
  emptyDescription: {
    color: colors.textMuted,
    maxWidth: 300,
    textAlign: "center",
  },
  loadingDots: { alignItems: "center", flexDirection: "row", gap: 4 },
  loadingDot: {
    backgroundColor: colors.primary,
    borderRadius: 4,
    height: 6,
    width: 6,
  },
});
