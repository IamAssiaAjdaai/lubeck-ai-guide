import { describe, expect, it } from "vitest";

import { getGuideConversationStorageKey } from "@/lib/tourConversation";

describe("guide conversation storage scope", () => {
  it("isolates standalone conversations by city and place", () => {
    const first = getGuideConversationStorageKey({
      kind: "place",
      citySlug: "ghent",
      placeSlug: "castle",
    });
    const otherPlace = getGuideConversationStorageKey({
      kind: "place",
      citySlug: "ghent",
      placeSlug: "cathedral",
    });
    const otherCity = getGuideConversationStorageKey({
      kind: "place",
      citySlug: "bruges",
      placeSlug: "castle",
    });

    expect(new Set([first, otherPlace, otherCity]).size).toBe(3);
  });

  it("isolates generic tours and preserves the legacy Lübeck key", () => {
    expect(getGuideConversationStorageKey({
      kind: "tour",
      citySlug: "lubeck",
      tourId: "lubeck_historic_center",
    })).toBe("citywalk:tour:conversation:lubeck_historic_center");
    expect(getGuideConversationStorageKey({
      kind: "tour",
      citySlug: "ghent",
      tourId: "historic-center",
    })).toBe("citywalk:guide:conversation:tour:ghent:historic-center");
  });
});
