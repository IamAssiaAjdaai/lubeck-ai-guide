import { getLocaleLabel, getSelectableLocales } from "@citywalk/i18n";
import { experimentalLocalesEnabled } from "../localization/localePreference";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../design/tokens";
import { triggerCitywalkHaptic } from "../lib/haptics";
import { useNativeLocale } from "../localization/LocaleProvider";
import { NativeIcon } from "./NativeIcon";
import { AppText } from "./ui";

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
            {getLocaleLabel(locale)}
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
            <ScrollView contentContainerStyle={styles.options}>
            <AppText variant="heading">{messages.language}</AppText>
            {getSelectableLocales(experimentalLocalesEnabled()).map((candidate) => (
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
                  {getLocaleLabel(candidate)}
                </Text>
              </Pressable>
            ))}
            </ScrollView>
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
    maxHeight: "80%",
    minWidth: 210,
    padding: spacing.md,
  },
  options: { gap: spacing.xs },
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
