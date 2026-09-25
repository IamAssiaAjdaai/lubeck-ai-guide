import { useState, type ComponentProps } from "react";
import {
  Modal,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { AppText, PressableSurface, PrimaryButton, Screen } from "./ui";
import { NativeIcon } from "./NativeIcon";
import {
  colors,
  layout,
  radius,
  shadows,
  spacing,
  typography,
} from "../design/tokens";
import { useNativeLocale } from "../localization/LocaleProvider";
import { walkCopy } from "@citywalk/traveler-core/walkCopy";

const icons: Record<string, ComponentProps<typeof NativeIcon>> = {
  history: { ios: "building.columns", android: "account_balance" },
  architecture: { ios: "building.2", android: "apartment" },
  "hidden-gems": { ios: "diamond", android: "diamond" },
  nature: { ios: "leaf", android: "eco" },
  food: { ios: "fork.knife", android: "restaurant" },
  culture: { ios: "theatermasks", android: "theater_comedy" },
  family: { ios: "person.3", android: "groups" },
  easy: { ios: "figure.walk", android: "directions_walk" },
  balanced: { ios: "figure.walk", android: "directions_walk" },
  long: { ios: "figure.hiking", android: "hiking" },
  anywhere: { ios: "flag", android: "flag" },
  loop: { ios: "arrow.uturn.backward", android: "undo" },
  destination: { ios: "mappin", android: "place" },
};
export function WalkChoices<T extends string | number>({
  label,
  options,
  selected,
  onSelect,
  multiple = false,
  variant = "chips",
  help,
  number,
  showHeading = true,
}: {
  label: string;
  options: readonly { value: T; label: string; description?: string }[];
  selected: readonly T[];
  onSelect: (value: T) => void;
  multiple?: boolean;
  variant?: "chips" | "time" | "segment" | "radio";
  help?: string;
  number?: number;
  showHeading?: boolean;
}) {
  const { width } = useWindowDimensions();
  return (
    <View style={styles.section}>
      {label && showHeading ? (
        <View style={styles.heading}>
          {number ? (
            <View style={styles.sectionNumber}>
              <AppText variant="label" style={{ color: colors.primary }}>
                {number}
              </AppText>
            </View>
          ) : null}
          <AppText variant="heading" style={styles.headingText}>
            {label}
          </AppText>
        </View>
      ) : null}
      {help ? <AppText style={styles.muted}>{help}</AppText> : null}
      <View
        accessibilityRole={multiple ? undefined : "radiogroup"}
        accessibilityLabel={label}
        style={[
          styles.options,
          variant === "segment" && styles.segment,
          variant === "radio" && styles.radioList,
        ]}
      >
        {options.map((option) => {
          const checked = selected.includes(option.value),
            icon =
              variant === "time"
                ? ({
                    ios: option.value === 240 ? "building.columns" : "clock",
                    android:
                      option.value === 240 ? "account_balance" : "schedule",
                  } as const)
                : icons[String(option.value)];
          return (
            <PressableSurface
              key={option.value}
              accessibilityRole={multiple ? "checkbox" : "radio"}
              accessibilityLabel={option.label}
              accessibilityState={{ checked }}
              onPress={() => onSelect(option.value)}
              style={[
                styles.option,
                variant === "chips" && width >= 380 && styles.wideChip,
                variant === "time" && styles.time,
                variant === "segment" && styles.segmentOption,
                variant === "radio" && styles.radio,
                checked && styles.selected,
                variant === "segment" && checked && styles.activeSegment,
              ]}
            >
              {icon ? (
                <View style={variant === "time" ? styles.timeIcon : undefined}>
                  <NativeIcon
                    {...icon}
                    size={variant === "time" ? 32 : 22}
                    color={
                      variant === "segment" && checked
                        ? colors.surface
                        : colors.primary
                    }
                  />
                </View>
              ) : null}
              <View style={variant === "time" ? undefined : styles.optionText}>
                <AppText
                  variant={variant === "time" ? "heading" : "metadata"}
                  style={
                    variant === "segment" && checked
                      ? { color: colors.surface, textAlign: "center" }
                      : undefined
                  }
                >
                  {option.label}
                </AppText>
                {option.description ? (
                  <AppText variant="metadata" style={styles.muted}>
                    {option.description}
                  </AppText>
                ) : null}
              </View>
              {variant !== "segment" ? (
                <NativeIcon
                  ios={checked ? "checkmark.circle.fill" : "circle"}
                  android={checked ? "check_circle" : "radio_button_unchecked"}
                  size={17}
                  color={checked ? colors.primary : colors.borderStrong}
                />
              ) : null}
            </PressableSurface>
          );
        })}
      </View>
    </View>
  );
}
export function WalkPlacePicker({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: readonly { value: string; label: string }[];
  selected: readonly string[];
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState("");
  const { locale } = useNativeLocale(),
    t = walkCopy(locale);
  return (
    <View>
      <PrimaryButton
        tone="secondary"
        wrapLabel
        label={`${label}${selected.length ? ` · ${options.find((o) => o.value === selected[0])?.label ?? ""}` : ""}`}
        onPress={() => setOpen(true)}
        trailingIcon={
          <NativeIcon
            ios="chevron.down"
            android="expand_more"
            color={colors.primary}
          />
        }
      />
      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <Screen navigation={false} brand={false}>
          <AppText variant="heading">{label}</AppText>
          <WalkInput label={label} value={query} onChangeText={setQuery} />
          <WalkChoices
            label=""
            variant="radio"
            options={options.filter((o) =>
              o.label
                .toLocaleLowerCase(locale)
                .includes(query.toLocaleLowerCase(locale)),
            )}
            selected={selected}
            onSelect={(value) => {
              onSelect(value);
              setOpen(false);
            }}
          />
          <PrimaryButton
            label={t.back}
            tone="secondary"
            onPress={() => setOpen(false)}
          />
        </Screen>
      </Modal>
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
  heading: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headingText: { flex: 1 },
  sectionNumber: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  muted: { color: colors.textMuted },
  options: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  option: {
    flexGrow: 1,
    flexBasis: "44%",
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  wideChip: { flexBasis: "29%", minWidth: 0, paddingHorizontal: spacing.sm },
  optionText: { flex: 1 },
  selected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  time: {
    minHeight: layout.timeCardHeight,
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
    ...shadows.card,
  },
  timeIcon: {
    width: 54,
    height: 54,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  segment: {
    flexWrap: "nowrap",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  segmentOption: {
    flex: 1,
    flexBasis: 0,
    borderWidth: 0,
    flexDirection: "column",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
  activeSegment: { backgroundColor: colors.primary },
  radioList: { flexDirection: "column" },
  radio: { flexBasis: "auto", width: "100%" },
  input: {
    minHeight: 48,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    borderColor: colors.border,
    color: colors.text,
    backgroundColor: colors.surfaceMuted,
    ...typography.body,
  },
});
