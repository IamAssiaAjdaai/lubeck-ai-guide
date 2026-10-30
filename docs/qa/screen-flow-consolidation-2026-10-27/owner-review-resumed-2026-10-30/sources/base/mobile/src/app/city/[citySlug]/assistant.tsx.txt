import { nativeCityName } from "../../../lib/displayNames";
import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { AppText, Screen, StatusMessage } from "../../../components/ui";
import { NativeIcon } from "../../../components/NativeIcon";
import { colors, spacing } from "../../../design/tokens";
import { discoveryCopy } from "../../../design/discoveryCopy";
import { cityAssistantContext, type CityAssistantContext } from "../../../lib/cityAssistant";
import { useNativeLocale } from "../../../localization/LocaleProvider";
import { usePublicCity } from "../../../hooks/usePublicContent";

export default function CityAssistantScreen() {
  const { citySlug } = useLocalSearchParams<{ citySlug?: string }>();
  const { messages } = useNativeLocale();
  const context = cityAssistantContext(citySlug);
  return context ? <CityAssistant context={context} /> : <Screen><StatusMessage>{messages.unavailable}</StatusMessage></Screen>;
}

export function CityAssistant({ context }: { context: CityAssistantContext }) {
  const { locale, direction, messages } = useNativeLocale();
  const city = usePublicCity(context.citySlug, locale);
  const copy = discoveryCopy(locale);
  return (
    <Screen>
      <View style={{ direction, gap: spacing.md }}>
        <NativeIcon ios="sparkles" android="auto_awesome" color={colors.primary} size={28} />
        <AppText variant="screenTitle">{messages.askCitywalk}</AppText>
        <AppText variant="heading">{nativeCityName(context.citySlug, city.status === "available" ? city.data.city.content.name : context.citySlug, locale)}</AppText>
        {/* The deployed guide contract requires placeSlug. Do not send a fake
            place or present a city-wide answer as grounded by that place. */}
        <StatusMessage>{copy.cityAssistantUnavailable}</StatusMessage>
      </View>
    </Screen>
  );
}
