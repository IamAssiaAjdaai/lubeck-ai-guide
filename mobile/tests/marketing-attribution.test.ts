import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => new Map<string, string>());

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
    clear: vi.fn(async () => {
      storage.clear();
    }),
  },
}));

import {
  loadNativeMarketingAttribution,
  persistNativeMarketingAttribution,
  readNativeMarketingAttribution,
} from "../src/lib/marketingAttribution";

describe("native marketing attribution", () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
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
