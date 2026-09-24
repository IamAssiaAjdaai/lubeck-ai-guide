import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { StaticVerifiedKnowledgeProvider } from "@/lib/verifiedKnowledge.server";
import type { KnowledgeChunk } from "@/lib/knowledge";

const chunks: readonly KnowledgeChunk[] = [
  {
    id: "sample-en",
    citySlug: "sample-city",
    placeSlug: "sample-place",
    locale: "en",
    text: "Verified English evidence.",
    topics: ["history"],
    priority: 1,
    source: {
      label: "Official source",
      url: "https://example.com/source",
      type: "official",
      verifiedAt: "2026-09-08",
    },
  },
  {
    id: "sample-fr",
    citySlug: "sample-city",
    placeSlug: "sample-place",
    locale: "fr",
    text: "Preuve française vérifiée.",
    topics: ["history"],
    priority: 1,
    source: {
      label: "Source officielle",
      url: "https://example.com/source",
      type: "official",
      verifiedAt: "2026-09-08",
    },
  },
];

describe("StaticVerifiedKnowledgeProvider", () => {
  it("filters city, place, and locale before retrieval", async () => {
    const provider = new StaticVerifiedKnowledgeProvider(chunks);
    await expect(provider.listVerifiedChunks({
      citySlug: "sample-city",
      placeSlug: "sample-place",
      locale: "en",
    })).resolves.toEqual([chunks[0]]);
    await expect(provider.listVerifiedChunks({
      citySlug: "other-city",
      placeSlug: "sample-place",
      locale: "en",
    })).resolves.toEqual([]);
    await expect(provider.listVerifiedChunks({
      citySlug: "sample-city",
      placeSlug: "sample-place",
      locale: "de",
    })).resolves.toEqual([]);
  });
});
