import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPublicCitySummaries: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/content/publicRepository.server", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/content/publicRepository.server")
  >("@/lib/content/publicRepository.server");
  return {
    ...actual,
    getPublicCitySummaries: mocks.getPublicCitySummaries,
  };
});

import { GET } from "@/app/api/content/cities/route";

describe("public city index API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPublicCitySummaries.mockResolvedValue([
      {
        city: {
          slug: "lubeck",
          content: { de: { name: "Lübeck" } },
        },
      },
      {
        city: {
          slug: "hamburg",
          countryCode: "DE",
          timezone: "Europe/Berlin",
          content: {
            en: {
              name: "Hamburg",
              shortDescription: "Harbour and history",
            },
          },
        },
      },
    ]);
  });

  it("lists only repository-approved discoverable cities with locale metadata", async () => {
    const response = await GET(
      new Request("https://citywalk.example/api/content/cities?locale=ar"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.getPublicCitySummaries).toHaveBeenCalledOnce();
    expect(body.cities).toHaveLength(2);
    expect(body.cities[1]).toMatchObject({
      slug: "hamburg",
      countryCode: "DE",
      timezone: "Europe/Berlin",
      requestedLocale: "ar",
      resolvedLocale: "en",
      didFallback: true,
    });
    expect(JSON.stringify(body)).not.toMatch(
      /publicationStatus|createdByUserId|updatedByUserId|objectKey/,
    );
  });

  it("rejects an invalid locale before reading city data", async () => {
    const response = await GET(
      new Request("https://citywalk.example/api/content/cities?locale=xx"),
    );

    expect(response.status).toBe(400);
    expect(mocks.getPublicCitySummaries).not.toHaveBeenCalled();
  });

  it("uses English when no locale query is provided", async () => {
    const response = await GET(
      new Request("https://citywalk.example/api/content/cities"),
    );
    const body = await response.json();

    expect(body.cities[1]).toMatchObject({
      requestedLocale: "en",
      resolvedLocale: "en",
      didFallback: false,
      name: "Hamburg",
    });
  });

  it("returns a clean unavailable response without leaking repository errors", async () => {
    mocks.getPublicCitySummaries.mockRejectedValue(
      new Error("database host and credentials must not leak"),
    );

    const response = await GET(
      new Request("https://citywalk.example/api/content/cities?locale=en"),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "City discovery is temporarily unavailable.",
    });
  });
});
