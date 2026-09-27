import { Modal } from "react-native";
import { router } from "expo-router";
import { t } from "@citywalk/i18n";
import { useNativeLocale } from "../localization/LocaleProvider";
import { Screen, AppText, PrimaryButton } from "./ui";
export function SaveAccountGate({ visible, onClose }: { visible: boolean; onClose(): void }) {
  const { locale } = useNativeLocale();
  function authenticate(entry: "sign-in" | "sign-up") {
    onClose();
    // Push preserves the exact mounted walk. No snapshot/automatic save continuation.
    router.push({ pathname: "/account", params: { entry, returnToWalk: "1" } });
  }
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <Screen navigation={false} onBack={onClose}>
      <AppText variant="screenTitle">{t(locale, "saved.gateTitle")}</AppText>
      <AppText>{t(locale, "saved.gateDescription")}</AppText>
      <PrimaryButton label={t(locale, "profile.signUp")} onPress={() => authenticate("sign-up")} />
      <PrimaryButton label={t(locale, "profile.signIn")} tone="secondary" onPress={() => authenticate("sign-in")} />
      <PrimaryButton label={t(locale, "saved.continueWithoutSaving")} tone="secondary" onPress={onClose} />
    </Screen>
  </Modal>;
}
