import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getPublicCitySnapshot,
  type PublicCitySnapshot,
} from "@/lib/content/publicRepository.server";
import { getGuideEligibility } from "@/lib/guideEligibility.server";
import type { VerifiedKnowledgeProvider } from "@/lib/verifiedKnowledge.server";

describe("getGuideEligibility", () => {
  let snapshot: PublicCitySnapshot;

  beforeAll(async () => {
    snapshot = await getPublicCitySnapshot("lubeck", "code");
  });

  it("enables only a published place with an active exact-locale chunk", async () => {
    await expect(getGuideEligibility({
      citySlug: "lubeck",
      placeSlug: "holstentor",
      source: "code",
      snapshot,
    })).resolves.toBe(true);
    await expect(getGuideEligibility({
      citySlug: "lubeck",
      placeSlug: "cafe-niederegger",
      source: "code",
      snapshot,
    })).resolves.toBe(false);
  });

  it("does not allow cross-city or unpublished place identity", async () => {
    const provider: VerifiedKnowledgeProvider = {
      listVerifiedChunks: vi.fn().mockResolvedValue([{ id: "forged" }]),
    };
    await expect(getGuideEligibility({
      citySlug: "other-city",
      placeSlug: "holstentor",
      source: "code",
      snapshot,
      provider,
    })).resolves.toBe(false);
    expect(provider.listVerifiedChunks).not.toHaveBeenCalled();
  });

  it("fails closed when the trusted provider is unavailable", async () => {
    const provider: VerifiedKnowledgeProvider = {
      listVerifiedChunks: vi.fn().mockRejectedValue(new Error("database unavailable")),
    };
    await expect(getGuideEligibility({
      citySlug: "lubeck",
      placeSlug: "holstentor",
      source: "database",
      snapshot,
      provider,
    })).resolves.toBe(false);
  });
});
