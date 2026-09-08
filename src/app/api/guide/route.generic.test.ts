import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  createCompletion: vi.fn(),
  getPublicCitySnapshot: vi.fn(),
  listVerifiedChunks: vi.fn(),
  rateLimit: vi.fn(),
}));

vi.mock("groq-sdk", () => ({
  default: class MockGroq {
    chat = { completions: { create: mocks.createCompletion } };
  },
}));
vi.mock("@/lib/rateLimit", () => ({
  aiGuideRateLimit: { limit: mocks.rateLimit },
}));
vi.mock("@/lib/content/source", () => ({ getContentSource: () => "database" }));
vi.mock("@/lib/content/publicRepository.server", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/content/publicRepository.server")
  >("@/lib/content/publicRepository.server");
  return { ...actual, getPublicCitySnapshot: mocks.getPublicCitySnapshot };
});
vi.mock("@/lib/verifiedKnowledge.server", () => ({
  getVerifiedKnowledgeProvider: () => ({
    listVerifiedChunks: mocks.listVerifiedChunks,
  }),
}));

import { POST } from "@/app/api/guide/route";
import type { KnowledgeChunk } from "@/lib/knowledge";

const chunk: KnowledgeChunk = {
  id: "generic-place-history",
  citySlug: "sample-city",
  placeSlug: "sample-place",
  locale: "en",
  text: "The verified date is 1234.",
  topics: ["history"],
  priority: 1,
  source: {
    label: "Official sample source",
    url: "https://example.com/sample-place",
    type: "official",
    verifiedAt: "2026-09-08",
  },
};

describe("POST /api/guide generic CMS place", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GROQ_API_KEY = "test-key";
    mocks.rateLimit.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60_000,
    });
    mocks.getPublicCitySnapshot.mockResolvedValue(publicSnapshot());
    mocks.listVerifiedChunks.mockImplementation(({ citySlug, placeSlug, locale }) =>
      Promise.resolve(
        citySlug === chunk.citySlug &&
        placeSlug === chunk.placeSlug &&
        locale === chunk.locale
          ? [chunk]
          : [],
      )
    );
    mocks.createCompletion.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            answer: "The verified date is 1234.",
            groundingStatus: "grounded",
            usedChunkIds: [chunk.id, "forged-id"],
          }),
        },
      }],
    });
  });

  it("answers for a published generic place with only server-owned source metadata", async () => {
    const response = await POST(requestFor("sample-city", "sample-place"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      answer: "The verified date is 1234.",
      sources: [{
        label: "Official sample source",
        url: "https://example.com/sample-place",
        verifiedAt: "2026-09-08",
        citySlug: "sample-city",
        placeSlug: "sample-place",
        chunkIds: ["generic-place-history"],
      }],
    });
    expect(mocks.createCompletion.mock.calls[0][0].messages[0].content)
      .toContain("sample-city");
  });

  it("rejects cross-city and non-public places before knowledge or model access", async () => {
    const crossCity = await POST(requestFor("other-city", "sample-place"));
    expect(crossCity.status).toBe(404);
    expect(mocks.listVerifiedChunks).not.toHaveBeenCalled();
    expect(mocks.createCompletion).not.toHaveBeenCalled();

    mocks.getPublicCitySnapshot.mockResolvedValue(publicSnapshot());
    const draftOnly = await POST(requestFor("sample-city", "draft-place"));
    expect(draftOnly.status).toBe(404);
    expect(mocks.listVerifiedChunks).not.toHaveBeenCalled();
  });

  it("does not enable a place from CMS content or source records without a verified chunk", async () => {
    mocks.listVerifiedChunks.mockResolvedValue([]);
    const response = await POST(requestFor("sample-city", "sample-place"));
    expect(response.status).toBe(404);
    expect(mocks.createCompletion).not.toHaveBeenCalled();
  });
});

function requestFor(citySlug: string, placeSlug: string) {
  return new Request("http://localhost/api/guide", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      citySlug,
      placeSlug,
      locale: "en",
      question: "When was this built?",
    }),
  });
}

function publicSnapshot() {
  return {
    city: {
      slug: "sample-city",
      content: { en: { name: "Sample City" } },
    },
    places: [{
      slug: "sample-place",
      city: "sample-city",
      category: "see",
      coordinates: { lat: 1, lng: 2 },
      durationMinutes: 20,
      environment: "outdoor",
      pricing: "free",
      tags: [],
      content: {
        en: { name: "Sample Place", shortDescription: "Public place." },
      },
    }],
    tours: [],
  };
}
