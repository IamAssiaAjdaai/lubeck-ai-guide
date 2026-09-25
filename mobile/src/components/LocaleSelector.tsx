import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../design/tokens";
import { NATIVE_LOCALES } from "../lib/localization";
import { triggerCitywalkHaptic } from "../lib/haptics";
import { useNativeLocale } from "../localization/LocaleProvider";
import { NativeIcon } from "./NativeIcon";
import { AppText } from "./ui";

const labels = { en: "EN", de: "DE", ar: "العربية" } as const;

export function LocaleSelector({ showLabel = false }: { showLabel?: boolean }) {
  const { locale, direction, messages, setLocale } = useNativeLocale();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={messages.language}
        accessibilityState={{ expanded: open }}
        hitSlop={6}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          { direction },
          showLabel && styles.labelledTrigger,
          pressed && styles.pressed,
        ]}
      >
        <NativeIcon ios="globe" android="language" size={showLabel ? 16 : 22} />
        {showLabel ? (
          <Text style={styles.currentLanguage}>
            {{ en: "English", de: "Deutsch", ar: "العربية" }[locale]}
          </Text>
        ) : null}
      </Pressable>
      <Modal
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        transparent
        visible={open}
      >
        <Pressable
          accessibilityLabel={messages.close}
          accessibilityRole="button"
          onPress={() => setOpen(false)}
          style={[styles.backdrop, { direction }]}
        >
          <View accessibilityRole="radiogroup" style={styles.menu}>
            <AppText variant="heading">{messages.language}</AppText>
            {NATIVE_LOCALES.map((candidate) => (
              <Pressable
                key={candidate}
                accessibilityRole="radio"
                accessibilityState={{ checked: candidate === locale }}
                onPress={() => {
                  void triggerCitywalkHaptic("light");
                  setLocale(candidate);
                  setOpen(false);
                }}
                style={[styles.option, candidate === locale && styles.selected]}
              >
                <Text
                  style={[
                    styles.label,
                    candidate === locale && styles.selectedLabel,
                  ]}
                >
                  {labels[candidate]}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  labelledTrigger: {
    width: "auto",
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  currentLanguage: { ...typography.caption, color: colors.textMuted },
  pressed: {
    backgroundColor: colors.surfaceMuted,
    transform: [{ scale: 0.96 }],
  },
  backdrop: {
    alignItems: "flex-end",
    backgroundColor: "rgba(23, 23, 23, 0.35)",
    flex: 1,
    justifyContent: "flex-start",
    paddingHorizontal: spacing.lg,
    paddingTop: 88,
  },
  menu: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    gap: spacing.xs,
    minWidth: 210,
    padding: spacing.md,
  },
  option: {
    alignItems: "center",
    borderRadius: radius.md,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  selected: { backgroundColor: colors.text },
  label: { ...typography.label, color: colors.text },
  selectedLabel: { color: colors.surface },
});
