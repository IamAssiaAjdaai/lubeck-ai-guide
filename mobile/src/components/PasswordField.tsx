import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { t } from "@citywalk/i18n";
import { colors, radius, spacing, typography } from "../design/tokens";
import { useNativeLocale } from "../localization/LocaleProvider";
import { NativeIcon } from "./NativeIcon";
import { AppText } from "./ui";

export function PasswordField({ label, value, onChange, newPassword = false, disabled = false }: {
  label: string; value: string; onChange: (value: string) => void; newPassword?: boolean; disabled?: boolean;
}) {
  const { locale, direction } = useNativeLocale();
  const [visible, setVisible] = useState(false);
  return <View style={styles.group}>
    <AppText variant="label">{label}</AppText>
    <View style={[styles.row, { direction }]}>
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChange}
        autoCapitalize="none" autoCorrect={false} spellCheck={false}
        autoComplete={newPassword ? "new-password" : "current-password"}
        textContentType={newPassword ? "newPassword" : "password"}
        secureTextEntry={!visible} editable={!disabled} style={[styles.input, { textAlign: direction === "rtl" ? "right" : "left" }]} />
      <Pressable accessibilityRole="button"
        accessibilityLabel={`${t(locale, visible ? "profile.hidePassword" : "profile.showPassword")}: ${label}`}
        accessibilityState={{ checked: visible }} onPress={() => setVisible(value => !value)} style={styles.eye}>
        <NativeIcon ios={visible ? "eye.slash" : "eye"} android={visible ? "visibility_off" : "visibility"} color={colors.primary} />
      </Pressable>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  group: { gap: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface },
  input: { flex: 1, minWidth: 0, minHeight: 50, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text, ...typography.body },
  eye: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
});
