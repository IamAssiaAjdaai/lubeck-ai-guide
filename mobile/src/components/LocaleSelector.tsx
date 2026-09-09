import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../design/tokens";
import { NATIVE_LOCALES } from "../lib/localization";
import { useNativeLocale } from "../localization/LocaleProvider";

const labels = { en: "EN", de: "DE", ar: "العربية" } as const;

export function LocaleSelector() {
  const { locale, setLocale } = useNativeLocale();
  return (
    <View accessibilityRole="radiogroup" style={styles.group}>
      {NATIVE_LOCALES.map((candidate) => (
        <Pressable
          key={candidate}
          accessibilityRole="radio"
          accessibilityState={{ checked: candidate === locale }}
          onPress={() => setLocale(candidate)}
          style={[styles.option, candidate === locale && styles.selected]}
        >
          <Text style={[styles.label, candidate === locale && styles.selectedLabel]}>{labels[candidate]}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: "row", gap: spacing.xs, alignSelf: "flex-start" },
  option: { minHeight: 40, minWidth: 44, paddingHorizontal: spacing.sm, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  selected: { backgroundColor: colors.text },
  label: { ...typography.caption, color: colors.textMuted },
  selectedLabel: { color: colors.surface },
});
