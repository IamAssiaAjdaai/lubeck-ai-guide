import { nativeCityName } from "../../../lib/displayNames";
import { Link, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { AppText, PrimaryButton, Screen, StatusMessage } from "../../../components/ui";
import { NativeIcon } from "../../../components/NativeIcon";
import { colors, spacing } from "../../../design/tokens";
import { walkCopy } from "@citywalk/traveler-core/walkCopy";
import { discoveryCopy } from "../../../design/discoveryCopy";
import { cityAssistantContext, type CityAssistantContext } from "../../../lib/cityAssistant";
import { useNativeLocale } from "../../../localization/LocaleProvider";
import { usePublicCity } from "../../../hooks/usePublicContent";

export default function CityAssistantScreen() {
  const { citySlug, returnToPlanner } = useLocalSearchParams<{ citySlug?: string; returnToPlanner?: string }>();
  const { messages } = useNativeLocale();
  const context = cityAssistantContext(citySlug);
  return context ? <CityAssistant context={context} returnToPlanner={returnToPlanner === "1"} /> : <Screen><StatusMessage>{messages.unavailable}</StatusMessage></Screen>;
}

export function CityAssistant({ context, returnToPlanner = false }: { context: CityAssistantContext; returnToPlanner?: boolean }) {
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
        {city.status === "available" && city.data.places.length > 0 ? (
          <Link dismissTo href={{ pathname: "/city/[citySlug]", params: { citySlug: context.citySlug, section: "places", ...(returnToPlanner ? { returnToPlanner: "1" } : {}) } }} asChild>
            <PrimaryButton label={walkCopy(locale).places} />
          </Link>
        ) : null}
      </View>
    </Screen>
  );
}
