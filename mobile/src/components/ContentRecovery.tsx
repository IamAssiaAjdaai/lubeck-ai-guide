import { Link } from "expo-router";
import { View } from "react-native";
import { useNativeLocale } from "../localization/LocaleProvider";
import { walkCopy } from "@citywalk/traveler-core/walkCopy";
import { spacing } from "../design/tokens";
import { PrimaryButton, StatusMessage } from "./ui";
import { welcomeCopy } from "../lib/welcomeCopy";

export function ContentRecovery({ retry, citySlug, cityUnavailable }: {
  retry?: () => void;
  citySlug?: string;
  cityUnavailable?: boolean;
}) {
  const { locale, messages } = useNativeLocale(), t = walkCopy(locale);
  return <View style={{ gap: spacing.sm }}>
    <StatusMessage>{messages.unavailable}</StatusMessage>
    {retry && !cityUnavailable ? <PrimaryButton label={messages.retry} onPress={retry} /> : null}
    <Link
      href={cityUnavailable ? { pathname: "/", params: { section: "cities" } }
        : citySlug ? { pathname: "/city/[citySlug]", params: { citySlug } } : "/"}
      replace={cityUnavailable}
      asChild
    >
      <PrimaryButton tone="secondary" label={cityUnavailable ? welcomeCopy[locale].explore : citySlug ? t.backCity : t.home} />
    </Link>
  </View>;
}
