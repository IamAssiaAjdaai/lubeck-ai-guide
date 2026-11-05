import { useEffect } from "react";
import { parsePlannerReturnEnvelope, type PlannerReturnEnvelope } from "../../../lib/plannerReturnIntent";
import { nativeCityName } from "../../../lib/displayNames";
import { Link, useLocalSearchParams, useNavigation, type NativeStackNavigationProp } from "expo-router";
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
  const params = useLocalSearchParams<{ citySlug?: string; returnToPlanner?: string; plannerReturnVersion?: string; plannerRouteKey?: string; plannerDraftToken?: string }>();
  const { citySlug } = params;
  const returnIntent = parsePlannerReturnEnvelope(params);
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();
  useEffect(() => {
    if (!returnIntent && navigation.isFocused() && [params.returnToPlanner, params.plannerReturnVersion, params.plannerRouteKey, params.plannerDraftToken].some(value => value !== undefined))
      navigation.setParams({ returnToPlanner: undefined, plannerReturnVersion: undefined, plannerRouteKey: undefined, plannerDraftToken: undefined });
  }, [navigation, returnIntent, params.returnToPlanner, params.plannerReturnVersion, params.plannerRouteKey, params.plannerDraftToken]);
  const { messages } = useNativeLocale();
  const context = cityAssistantContext(citySlug);
  return context ? <CityAssistant context={context} returnIntent={returnIntent} /> : <Screen><StatusMessage>{messages.unavailable}</StatusMessage></Screen>;
}

export function CityAssistant({ context, returnIntent }: { context: CityAssistantContext; returnIntent?: PlannerReturnEnvelope }) {
  const { locale, direction, messages } = useNativeLocale();
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();
  const envelope = returnIntent?.citySlug === context.citySlug ? parsePlannerReturnEnvelope(returnIntent) : undefined;
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
          <Link dismissTo onPress={() => {
            if (envelope || !navigation.isFocused()) return;
            const stack = navigation.getState();
            const hub = stack.routes.slice(0, stack.index).findLast(candidate => candidate.name === "city/[citySlug]/index" && (candidate.params as { citySlug?: unknown } | undefined)?.citySlug === context.citySlug);
            if (hub) navigation.dispatch({ type: "SET_PARAMS", source: hub.key, target: stack.key, payload: { params: { returnToPlanner: undefined, plannerReturnVersion: undefined, plannerRouteKey: undefined, plannerDraftToken: undefined } } });
          }} href={{ pathname: "/city/[citySlug]", params: { citySlug: context.citySlug, section: "places", returnToPlanner: undefined, plannerReturnVersion: undefined, plannerRouteKey: undefined, plannerDraftToken: undefined, ...envelope } }} asChild>
            <PrimaryButton label={walkCopy(locale).places} />
          </Link>
        ) : null}
      </View>
    </Screen>
  );
}
