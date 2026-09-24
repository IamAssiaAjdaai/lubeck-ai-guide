import { StyleSheet, TextInput, View } from "react-native";
import { AppText, PressableSurface } from "./ui";
import { colors, radius, spacing } from "../design/tokens";
import { useNativeLocale } from "../localization/LocaleProvider";

export function WalkChoices<T extends string | number>({
  label,
  options,
  selected,
  onSelect,
  multiple = false,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  selected: readonly T[];
  onSelect: (value: T) => void;
  multiple?: boolean;
}) {
  return (
    <View style={styles.section}>
      <AppText variant="heading">{label}</AppText>
      <View style={styles.options}>
        {options.map((option) => {
          const checked = selected.includes(option.value);
          return (
            <PressableSurface
              key={option.value}
              accessibilityRole={multiple ? "checkbox" : "radio"}
              accessibilityLabel={option.label}
              accessibilityState={{ checked }}
              onPress={() => onSelect(option.value)}
              style={[styles.option, checked && styles.selected]}
            >
              <AppText>
                {checked ? "✓ " : ""}
                {option.label}
              </AppText>
            </PressableSurface>
          );
        })}
      </View>
    </View>
  );
}
export function WalkInput({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}) {
  const { direction } = useNativeLocale();
  return (
    <View style={styles.section}>
      <AppText>{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          {
            writingDirection: direction,
            textAlign: direction === "rtl" ? "right" : "left",
          },
        ]}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  options: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  option: {
    minHeight: 48,
    justifyContent: "center",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  input: {
    minHeight: 48,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    borderColor: colors.border,
    color: colors.text,
    backgroundColor: colors.surface,
    fontSize: 16,
  },
});
