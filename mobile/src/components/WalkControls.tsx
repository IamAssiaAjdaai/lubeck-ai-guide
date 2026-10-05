import { useState, type ComponentProps } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { AppText, PressableSurface, PrimaryButton, Screen } from "./ui";
import { useResponsiveTextLayout } from "../design/responsiveText";
import { NativeIcon } from "./NativeIcon";
import {
  colors,
  radius,
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
  compact = false,
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
  compact?: boolean;
}) {
  const { width } = useWindowDimensions();
  const { categoryColumns } = useResponsiveTextLayout();
  const wrapSegments = compact && options.length > categoryColumns;
  const { direction } = useNativeLocale();
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
          variant === "time" && styles.timeOptions,
          variant === "segment" && styles.segment,
          variant === "radio" && styles.radioList,
          compact && [styles.compactOptions, { direction, flexWrap: wrapSegments ? "wrap" : "nowrap" }],
        ]}
      >
        {options.map((option) => {
          const checked = selected.includes(option.value),
            icon =
              variant === "time"
                ? undefined
                : icons[String(option.value)];
          const isCompactChip = compact && variant === "chips";
          return (
            <PressableSurface
              key={option.value}
              accessibilityRole={multiple ? "checkbox" : "radio"}
              accessibilityLabel={option.label}
              accessibilityState={{ checked }}
              onPress={() => onSelect(option.value)}
              style={[
                styles.option,
                variant === "chips" && width >= 380 && !compact && styles.wideChip,
                variant === "time" && styles.time,
                variant === "segment" && styles.segmentOption,
                variant === "radio" && styles.radio,
                checked && styles.selected,
                variant === "segment" && checked && styles.activeSegment,
                compact && [styles.compactOption, wrapSegments && { flexBasis: "45%" }],
                isCompactChip && styles.compactChip,
              ]}
            >
              {icon && !isCompactChip ? (
                <NativeIcon
                  {...icon}
                  size={20}
                  color={
                    variant === "segment" && checked
                      ? colors.surface
                      : colors.primary
                  }
                />
              ) : null}
              <View
                style={
                  compact
                    ? { minWidth: 0, flexShrink: 1, flexGrow: 1 }
                    : variant === "time"
                      ? styles.timeCopy
                      : styles.optionText
                }
              >
                {compact ? (
                  <Text
                    style={[
                      styles.compactLabel,
                      { writingDirection: direction },
                      checked && variant === "chips" && styles.compactLabelSelected,
                      variant === "segment" && checked && { color: colors.surface },
                    ]}
                  >
                    {option.label}
                  </Text>
                ) : (
                  <AppText
                    variant={variant === "time" ? "label" : "metadata"}
                    style={
                      variant === "segment" && checked
                        ? { color: colors.surface, textAlign: "center" }
                        : variant === "time"
                          ? styles.timeLabel
                          : undefined
                    }
                  >
                    {option.label}
                  </AppText>
                )}
                {option.description && variant !== "time" ? (
                  <AppText variant="metadata" style={styles.muted}>
                    {option.description}
                  </AppText>
                ) : null}
              </View>
              {isCompactChip && checked ? (
                <NativeIcon
                  ios="checkmark"
                  android="check"
                  size={15}
                  color={colors.primary}
                />
              ) : variant !== "segment" && variant !== "time" && !isCompactChip ? (
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
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
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
  timeOptions: {
    gap: spacing.sm,
  },
  time: {
    flexBasis: "47%",
    minHeight: 52,
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  timeCopy: { flex: 1, alignItems: "center" },
  timeLabel: { textAlign: "center", width: "100%" },
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
  compactOptions: { alignSelf: "stretch", width: "100%", borderRadius: radius.sm },
  compactOption: {
    flex: 1,
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    minHeight: 42,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    flexDirection: "row",
  },
  compactChip: {
    flexBasis: "auto",
    flexGrow: 0,
    minHeight: 40,
    backgroundColor: colors.surface,
  },
  compactLabel: { ...typography.metadata, color: colors.text, textAlign: "center" },
  compactLabelSelected: { color: colors.primary, fontWeight: "600" },
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
