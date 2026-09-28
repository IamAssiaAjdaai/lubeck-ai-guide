import { useState } from "react";
import type { PublicCitySummaryResponse } from "../../../lib/api/contracts";
import { ContentRecovery } from "../../../components/ContentRecovery";
import { nativeCityName } from "../../../lib/displayNames";
import { Stack, useLocalSearchParams } from "expo-router";
import { CitywalkLoading } from "../../../components/CitywalkLoading";
import { NativeWalkFlow } from "../../../components/NativeWalkFlow";
import { CityUnlockGate } from "../../../components/CityUnlockGate";
import { Screen } from "../../../components/ui";
import { usePublicCity } from "../../../hooks/usePublicContent";
import { useNativeLocale } from "../../../localization/LocaleProvider";
import { parseCityRouteIdentity } from "../../../lib/routing";
import { discoveryCopy } from "../../../design/discoveryCopy";
export default function WalkScreen() {
  const params = useLocalSearchParams<{
    citySlug: string;
    saved?: string;
    source?: string;
    add?: string;
  }>();
  const identity = parseCityRouteIdentity(params.citySlug);
  const { locale } = useNativeLocale();
  const state = usePublicCity(identity?.citySlug ?? "invalid", locale);
  const [previous, setPrevious] = useState<{ citySlug: string; locale: string; data: PublicCitySummaryResponse }>();
  if (identity && state.status === "available" &&
      (previous?.citySlug !== identity.citySlug || previous.locale !== locale)) {
    setPrevious({ citySlug: identity.citySlug, locale, data: state.data });
  }
  // A locale fetch must not unmount the active walk or reopen a saved route as a new journey.
  const data = state.status === "available" ? state.data : previous?.citySlug === identity?.citySlug ? previous?.data : undefined;
  if (!identity || (state.status === "error" && !data))
    return (
      <Screen>
        <ContentRecovery retry={state.status === "error" ? state.retry : undefined} citySlug={identity?.citySlug} />
      </Screen>
    );
  if (!data)
    return (
      <Screen>
        <CitywalkLoading variant="city" label={discoveryCopy(locale).loadingWalkContent} />
      </Screen>
    );
  return (
    <>
      <Stack.Screen options={{ title: nativeCityName(data.city.slug, data.city.content.name, locale) }} />
      {state.status === "error" ? <ContentRecovery retry={state.retry} citySlug={identity.citySlug} /> : null}
      <CityUnlockGate citySlug={identity.citySlug} cityName={data.city.content.name}>{authorizeStart => <NativeWalkFlow
        authorizeStart={authorizeStart}
        key={`${identity.citySlug}:${params.saved ?? "active"}:${params.add ?? ""}`}
        citySlug={identity.citySlug}
        cityName={data.city.content.name}
        places={data.places}
        contentStatus={state.status}
        savedId={params.saved}
      accountSaved={params.source === "account"}
        addSlug={params.add}
      />}</CityUnlockGate>
    </>
  );
}
