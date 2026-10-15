import type { ExpoConfig } from "expo/config";
import { describe, expect, it } from "vitest";

import {
  CITYWALK_APP_LINK_HOST,
  createCitywalkExpoConfig,
} from "../app.config";

const baseConfig: ExpoConfig = {
  name: "CITYWALK",
  slug: "citywalk-mobile",
  plugins: ["expo-router"],
};

describe("CITYWALK native app links", () => {
  it.each(["preview", "production"] as const)(
    "enables verified https app links for %s builds",
    (environment) => {
      const config = createCitywalkExpoConfig(baseConfig, environment);

      expect(config.ios?.associatedDomains).toContain(
        `applinks:${CITYWALK_APP_LINK_HOST}`,
      );
      expect(config.android?.intentFilters).toContainEqual({
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: "https",
            host: CITYWALK_APP_LINK_HOST,
            pathPrefix: "/open/",
          },
          {
            scheme: "https",
            host: CITYWALK_APP_LINK_HOST,
            pathPrefix: "/shared-walk/",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      });
    },
  );

  it("does not claim production web-domain links from the development bundle id", () => {
    const config = createCitywalkExpoConfig(baseConfig, "development");

    expect(config.ios?.associatedDomains).toBeUndefined();
    expect(config.android?.intentFilters).toBeUndefined();
  });
});
