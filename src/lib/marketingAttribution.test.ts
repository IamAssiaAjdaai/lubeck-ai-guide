import { describe, expect, it } from "vitest";

import {
  appendMarketingAttributionToPath,
  buildMarketingTrackingPath,
  marketingAttributionPostHogProperties,
  readMarketingAttribution,
} from "@/lib/marketingAttribution";

describe("Marketing attribution", () => {
  it("builds deterministic UTM parameters without dropping existing query params", () => {
    expect(
      buildMarketingTrackingPath({
        path: "/lubeck/2-hours?locale=en",
        platform: " Instagram Reels ",
        campaignSlug: "Two Hours in Lübeck",
        contentCode: " CW-LUB-TIME-001 ",
      }),
    ).toBe(
      "/lubeck/2-hours?locale=en&utm_source=instagram-reels&utm_medium=social&utm_campaign=two-hours-in-l-beck&utm_content=CW-LUB-TIME-001",
    );
  });

  it("parses URL attribution and maps it to the PostHog property contract", () => {
    const attribution = readMarketingAttribution(
      new URLSearchParams(
        "utm_source=instagram&utm_medium=social&utm_campaign=two-hours-in-lubeck&utm_content=CW-LUB-TIME-001",
      ),
    );

    expect(attribution).toEqual({
      source: "instagram",
      medium: "social",
      campaign: "two-hours-in-lubeck",
      contentId: "CW-LUB-TIME-001",
    });
    expect(marketingAttributionPostHogProperties(attribution)).toEqual({
      source: "instagram",
      medium: "social",
      campaign: "two-hours-in-lubeck",
      content_id: "CW-LUB-TIME-001",
    });
  });

  it("ignores empty values from Next-style search params", () => {
    expect(
      readMarketingAttribution({
        utm_source: "  tiktok  ",
        utm_medium: "",
        utm_campaign: undefined,
        utm_content: ["CW-LUB-001", "ignored"],
      }),
    ).toEqual({ source: "tiktok", contentId: "CW-LUB-001" });
  });
  it("forwards known attribution while preserving destination query params", () => {
    expect(appendMarketingAttributionToPath("/en/lubeck?mode=custom", { source:"instagram", medium:"social", campaign:"two-hours", contentId:"CW-LUB-001" })).toBe("/en/lubeck?mode=custom&utm_source=instagram&utm_medium=social&utm_campaign=two-hours&utm_content=CW-LUB-001");
  });
});
