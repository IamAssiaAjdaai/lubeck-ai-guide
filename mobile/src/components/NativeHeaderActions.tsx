import { Link } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { colors, radius, spacing } from "../design/tokens";
import { useNativeLocale } from "../localization/LocaleProvider";
import { LocaleSelector } from "./LocaleSelector";
import { NativeIcon } from "./NativeIcon";

export function NativeHeaderActions() {
  const { messages } = useNativeLocale();

  return (
    <View style={styles.actions}>
      <LocaleSelector />
      <Link href="/account" asChild>
        <Pressable
          accessibilityLabel={messages.account}
          accessibilityRole="button"
          hitSlop={6}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <NativeIcon ios="person.crop.circle" android="account_circle" />
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  action: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  pressed: { backgroundColor: colors.surfaceMuted, transform: [{ scale: 0.96 }] },
});
