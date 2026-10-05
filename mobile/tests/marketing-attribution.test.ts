import AsyncStorage from "@react-native-async-storage/async-storage";
import { beforeEach, describe, expect, it } from "vitest";

import {
  loadNativeMarketingAttribution,
  persistNativeMarketingAttribution,
  readNativeMarketingAttribution,
} from "../src/lib/marketingAttribution";

describe("native marketing attribution", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("normalizes incoming Expo Router params", () => {
    expect(readNativeMarketingAttribution({
      citySlug: " lubeck ",
      marketingSlug: ["2-hours", "ignored"],
      utm_source: " instagram ",
      utm_medium: "social",
      utm_campaign: "two-hours-in-lubeck",
      utm_content: "CW-LUB-TIME-001",
    })).toEqual({
      citySlug: "lubeck",
      landingVariant: "2-hours",
      source: "instagram",
      medium: "social",
      campaign: "two-hours-in-lubeck",
      contentId: "CW-LUB-TIME-001",
    });
  });

  it("persists acquisition attribution for the later native funnel", async () => {
    const value = {
      citySlug: "lubeck",
      landingVariant: "2-hours",
      source: "instagram",
      campaign: "two-hours-in-lubeck",
    } as const;

    await persistNativeMarketingAttribution(value);
    await expect(loadNativeMarketingAttribution()).resolves.toEqual(value);
  });
});
