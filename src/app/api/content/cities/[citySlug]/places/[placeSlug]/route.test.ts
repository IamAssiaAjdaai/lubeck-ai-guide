import { PublicContentNotFoundError } from "@/lib/content/errors";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPublicCitySnapshot: vi.fn(),
  toLocalizedPublicPlaceResponse: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/content/publicRepository.server", () => mocks);

import { GET } from "@/app/api/content/cities/[citySlug]/places/[placeSlug]/route";

describe("public place detail API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPublicCitySnapshot.mockResolvedValue({ city: { slug: "lubeck" } });
    mocks.toLocalizedPublicPlaceResponse.mockReturnValue({
      city: { slug: "lubeck", content: { name: "Lübeck" }, media: [] },
      place: {
        slug: "holstentor",
        content: { name: "Holstentor", story: "Full detail fetched on demand." },
        media: [],
      },
    });
  });

  it("returns one published place with detail fields and cache metadata", async () => {
    const response = await GET(
      new Request("https://citywalk.example/api/content/cities/lubeck/places/holstentor?locale=de"),
      { params: Promise.resolve({ citySlug: "lubeck", placeSlug: "holstentor" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=60");
    await expect(response.json()).resolves.toMatchObject({
      place: { slug: "holstentor", content: { story: "Full detail fetched on demand." } },
    });
    expect(mocks.toLocalizedPublicPlaceResponse).toHaveBeenCalledWith(
      expect.anything(),
      "holstentor",
      "de",
    );
  });

  it("fails closed without leaking unavailable place details", async () => {
    mocks.toLocalizedPublicPlaceResponse.mockImplementationOnce(() => {
      throw new PublicContentNotFoundError("working revision must stay private");
    });
    const response = await GET(
      new Request("https://citywalk.example/api/content/cities/lubeck/places/draft?locale=en"),
      { params: Promise.resolve({ citySlug: "lubeck", placeSlug: "draft" }) },
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({ error: "Published place not found." });
  });
  it("returns a non-cacheable 503 for infrastructure failures without substituting content", async () => {
    mocks.getPublicCitySnapshot.mockRejectedValueOnce(new Error("private database credentials"));
    const response = await GET(
      new Request("https://citywalk.example/api/content/cities/lubeck/places/holstentor"),
      { params: Promise.resolve({ citySlug: "lubeck", placeSlug: "holstentor" }) },
    );
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({ error: "Content is temporarily unavailable." });
  });

});
