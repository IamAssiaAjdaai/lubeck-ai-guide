import { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

import { CitywalkLoading } from "../../../components/CitywalkLoading";
import { Screen } from "../../../components/ui";
import {
  persistNativeMarketingAttribution,
  readNativeMarketingAttribution,
} from "../../../lib/marketingAttribution";

export default function NativeMarketingHandoffScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    citySlug?: string | string[];
    marketingSlug?: string | string[];
    intent?: string | string[];
    utm_source?: string | string[];
    utm_medium?: string | string[];
    utm_campaign?: string | string[];
    utm_content?: string | string[];
  }>();

  useEffect(() => {
    const citySlug = first(params.citySlug);
    const marketingSlug = first(params.marketingSlug);
    const intent = first(params.intent);

    if (!citySlug || !marketingSlug || intent !== "build_walk") {
      router.replace("/");
      return;
    }

    const attribution = readNativeMarketingAttribution({
      citySlug,
      marketingSlug,
      utm_source: params.utm_source,
      utm_medium: params.utm_medium,
      utm_campaign: params.utm_campaign,
      utm_content: params.utm_content,
    });

    void persistNativeMarketingAttribution(attribution).finally(() => {
      router.replace({
        pathname: "/city/[citySlug]/walk",
        params: { citySlug, source: "marketing" },
      });
    });
  }, [params, router]);

  return (
    <Screen>
      <CitywalkLoading variant="city" />
    </Screen>
  );
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
