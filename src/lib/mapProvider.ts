import type { AttributionControlOptions } from "maplibre-gl";

export type MapProviderConfig = Readonly<{
  styleUrl: string;
  attributionControl: false | AttributionControlOptions;
}>;

const DEFAULT_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

export const mapProviderConfig: MapProviderConfig = {
  styleUrl:
    process.env.NEXT_PUBLIC_CITY_MAP_STYLE_URL?.trim() || DEFAULT_STYLE_URL,
  attributionControl: {},
};
