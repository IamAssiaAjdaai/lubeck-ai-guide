import { useState } from "react";
import { Host, DatePicker } from "@expo/ui/swift-ui";
import { Modal, Platform, StyleSheet, View } from "react-native";
import { useNativeLocale } from "../localization/LocaleProvider";
import { colors, radius, spacing } from "../design/tokens";
import { AppText, PressableSurface } from "./ui";
import { NativeIcon } from "./NativeIcon";
import { WalkInput } from "./WalkControls";

function timeDate(value: string): Date {
  const now = new Date();
  const match = /^(\\d{2}):(\\d{2})$/.exec(value);
  const h = match ? Number(match[1]) : now.getHours();
  const m = match ? Number(match[2]) : now.getMinutes();
  now.setHours(h < 24 ? h : 12, m < 60 ? m : 0, 0, 0);
  return now;
}
function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
export function ReturnByTimePicker({ label, value, onChangeText, placeholder }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  const { locale } = useNativeLocale();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => timeDate(value));
  // Android retains the validated HH:MM input until a native Android picker is implemented.
  if (Platform?.OS !== "ios") {
    return <WalkInput label={label} value={value} onChangeText={onChangeText} placeholder={placeholder} />;
  }

  const done = locale === "de" ? "Fertig" : locale === "es" ? "Listo" : locale === "nl" ? "Gereed" : locale === "da" ? "Færdig" : locale === "sv" ? "Klar" : locale === "ar" ? "تم" : "Done";
  const clear = locale === "de" ? "Keine feste Uhrzeit" : locale === "es" ? "Sin hora fija" : locale === "nl" ? "Geen eindtijd" : locale === "da" ? "Intet fast tidspunkt" : locale === "sv" ? "Ingen fast tid" : locale === "ar" ? "بدون موعد محدد" : "No deadline";
  return (
    <View style={styles.container}>
      <AppText>{label}</AppText>
      <PressableSurface
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => { setDraft(timeDate(value)); setOpen(true); }}
        style={styles.trigger}
      >
        <NativeIcon ios="clock" android="schedule" size={19} color={colors.primary} />
        <AppText style={value ? styles.value : styles.placeholder}>{value || placeholder}</AppText>
        <NativeIcon ios="chevron.down" android="expand_more" size={18} color={colors.primary} />
      </PressableSurface>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.scrim}>
          <View style={styles.sheet}>
            <AppText variant="heading">{label}</AppText>
            <Host style={styles.host}>
              <DatePicker title={label} selection={draft} displayedComponents={["hourAndMinute"]} onDateChange={setDraft} />
            </Host>
            <PressableSurface accessibilityRole="button" accessibilityLabel={done} style={styles.done} onPress={() => { onChangeText(formatTime(draft)); setOpen(false); }}>
              <AppText style={styles.doneText}>{done}</AppText>
            </PressableSurface>
            <PressableSurface accessibilityRole="button" accessibilityLabel={clear} style={styles.clear} onPress={() => { onChangeText(""); setOpen(false); }}>
              <AppText style={styles.clearText}>{clear}</AppText>
            </PressableSurface>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  trigger: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, minHeight: 58, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted },
  value: { flex: 1, color: colors.text, fontWeight: "600" },
  placeholder: { flex: 1, color: colors.textMuted },
  scrim: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.32)" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 22, paddingTop: 22, paddingBottom: 38, backgroundColor: colors.surface, gap: 14 },
  host: { height: 120, width: "100%" },
  done: { minHeight: 52, backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", alignItems: "center" },
  doneText: { color: colors.surface, fontWeight: "700" },
  clear: { minHeight: 44, justifyContent: "center", alignItems: "center" },
  clearText: { color: colors.primary, fontWeight: "600" },
});
