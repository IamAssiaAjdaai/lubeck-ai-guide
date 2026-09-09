import type { PropsWithChildren, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type TextProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, radius, spacing, typography } from "../design/tokens";
import { useNativeLocale } from "../localization/LocaleProvider";

export function Screen({ children }: PropsWithChildren) {
  const { direction } = useNativeLocale();
  return (
    <SafeAreaView style={[styles.safeArea, { direction }]} edges={["bottom", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.screenContent}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
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

export function PrimaryButton({
  label,
  busy = false,
  ...props
}: PressableProps & { label: string; busy?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      {...props}
      disabled={busy || props.disabled}
      style={({ pressed }) => [
        styles.primaryButton,
        pressed && styles.primaryButtonPressed,
        (busy || props.disabled) && styles.disabled,
      ]}
    >
      {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{label}</Text>}
    </Pressable>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <AppText variant="heading" style={styles.sectionTitle}>{children}</AppText>;
}

export function StatusMessage({ children }: { children: ReactNode }) {
  return (
    <View accessibilityRole="alert" style={styles.status}>
      <AppText>{children}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  screenContent: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  text: { color: colors.text },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: "#171717",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonPressed: { backgroundColor: colors.primaryPressed },
  buttonText: { color: "#FFFFFF", ...typography.label },
  disabled: { opacity: 0.55 },
  sectionTitle: { marginTop: spacing.sm },
  status: { borderRadius: radius.md, backgroundColor: "#EEF2FF", padding: spacing.md },
});
