import { Stack, useLocalSearchParams } from "expo-router";
import { CitywalkLoading } from "../../../components/CitywalkLoading";
import { NativeWalkFlow } from "../../../components/NativeWalkFlow";
import { Screen, StatusMessage } from "../../../components/ui";
import { usePublicCity } from "../../../hooks/usePublicContent";
import { useNativeLocale } from "../../../localization/LocaleProvider";
import { parseCityRouteIdentity } from "../../../lib/routing";
export default function WalkScreen() {
  const params = useLocalSearchParams<{
    citySlug: string;
    saved?: string;
    add?: string;
  }>();
  const identity = parseCityRouteIdentity(params.citySlug);
  const { locale, messages } = useNativeLocale();
  const state = usePublicCity(identity?.citySlug ?? "invalid", locale);
  if (!identity || state.status === "error")
    return (
      <Screen>
        <StatusMessage>{messages.unavailable}</StatusMessage>
      </Screen>
    );
  if (state.status === "loading")
    return (
      <Screen>
        <CitywalkLoading variant="city" />
      </Screen>
    );
  return (
    <>
      <Stack.Screen options={{ title: state.data.city.content.name }} />
      <NativeWalkFlow
        key={`${identity.citySlug}:${params.saved ?? "active"}:${params.add ?? ""}`}
        citySlug={identity.citySlug}
        cityName={state.data.city.content.name}
        places={state.data.places}
        savedId={params.saved}
        addSlug={params.add}
      />
    </>
  );
}
