import { Link } from "expo-router";
import { View } from "react-native";
import { useNativeLocale } from "../localization/LocaleProvider";
import { walkCopy } from "@citywalk/traveler-core/walkCopy";
import { spacing } from "../design/tokens";
import { PrimaryButton, StatusMessage } from "./ui";

export function ContentRecovery({ retry, citySlug }: { retry?: () => void; citySlug?: string }) {
  const { locale, messages } = useNativeLocale(), t = walkCopy(locale);
  return <View style={{ gap: spacing.sm }}>
    <StatusMessage>{messages.unavailable}</StatusMessage>
    {retry ? <PrimaryButton label={messages.retry} onPress={retry} /> : null}
    <Link href={citySlug ? { pathname: "/city/[citySlug]", params: { citySlug } } : "/"} asChild>
      <PrimaryButton tone="secondary" label={citySlug ? t.backCity : t.home} />
    </Link>
  </View>;
}
