import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPublicCitySnapshot: vi.fn(),
  toLocalizedPublicCityResponse: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/content/publicRepository.server", () => mocks);

import { GET } from "@/app/api/content/cities/[citySlug]/route";

describe("public city content API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPublicCitySnapshot.mockResolvedValue({ city: { slug: "lubeck" } });
    mocks.toLocalizedPublicCityResponse.mockReturnValue({
      city: {
        slug: "lubeck",
        requestedLocale: "ar",
        resolvedLocale: "en",
        didFallback: true,
        content: { name: "Lubeck" },
      },
      places: [],
      tours: [],
    });
  });

  it("returns published public DTOs with explicit locale fallback metadata", async () => {
    const response = await GET(
      new Request("https://citywalk.example/api/content/cities/lubeck?locale=ar"),
      { params: Promise.resolve({ citySlug: "lubeck" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.getPublicCitySnapshot).toHaveBeenCalledWith("lubeck");
    expect(mocks.toLocalizedPublicCityResponse).toHaveBeenCalledWith(
      expect.anything(),
      "ar",
    );
    expect(body.city).toMatchObject({
      requestedLocale: "ar",
      resolvedLocale: "en",
      didFallback: true,
    });
    expect(JSON.stringify(body)).not.toMatch(
      /createdByUserId|updatedByUserId|publicationStatus/,
    );
  });

  it("rejects unsupported locales before reading content", async () => {
    const response = await GET(
      new Request("https://citywalk.example/api/content/cities/lubeck?locale=xx"),
      { params: Promise.resolve({ citySlug: "lubeck" }) },
    );

    expect(response.status).toBe(400);
    expect(mocks.getPublicCitySnapshot).not.toHaveBeenCalled();
  });

  it("returns a clean 404 without leaking repository errors", async () => {
    mocks.getPublicCitySnapshot.mockRejectedValue(
      new Error("database details must not leak"),
    );
    const response = await GET(
      new Request("https://citywalk.example/api/content/cities/missing"),
      { params: Promise.resolve({ citySlug: "missing" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Published city not found.",
    });
  });
});
