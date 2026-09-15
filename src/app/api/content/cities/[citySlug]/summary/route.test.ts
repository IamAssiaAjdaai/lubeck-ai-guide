import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPublicCitySnapshot: vi.fn(),
  toLocalizedPublicCitySummaryResponse: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/content/publicRepository.server", () => mocks);

import { GET } from "@/app/api/content/cities/[citySlug]/summary/route";

describe("compact public city API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPublicCitySnapshot.mockResolvedValue({ city: { slug: "hamburg" } });
    mocks.toLocalizedPublicCitySummaryResponse.mockReturnValue({
      city: { slug: "hamburg", content: { name: "Hamburg" }, media: [] },
      places: [{
        slug: "hamburg-rathaus",
        content: { name: "Hamburg Rathaus", shortDescription: "Civic landmark" },
        media: [],
      }],
      tours: [],
    });
  });

  it("returns the compact public contract with shared CDN metadata", async () => {
    const response = await GET(
      new Request("https://citywalk.example/api/content/cities/hamburg/summary?locale=en"),
      { params: Promise.resolve({ citySlug: "hamburg" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("stale-while-revalidate=300");
    expect(response.headers.get("X-Citywalk-Content-Version")).toHaveLength(16);
    expect(body.places[0].content).toEqual({
      name: "Hamburg Rathaus",
      shortDescription: "Civic landmark",
    });
    expect(mocks.toLocalizedPublicCitySummaryResponse).toHaveBeenCalledWith(
      expect.anything(),
      "en",
    );
  });

  it("keeps unsupported and unavailable responses private", async () => {
    const invalid = await GET(
      new Request("https://citywalk.example/api/content/cities/hamburg/summary?locale=xx"),
      { params: Promise.resolve({ citySlug: "hamburg" }) },
    );
    expect(invalid.status).toBe(400);
    expect(invalid.headers.get("Cache-Control")).toBe("private, no-store");

    mocks.getPublicCitySnapshot.mockRejectedValueOnce(new Error("private database detail"));
    const missing = await GET(
      new Request("https://citywalk.example/api/content/cities/missing/summary?locale=en"),
      { params: Promise.resolve({ citySlug: "missing" }) },
    );
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "Published city not found." });
  });
});
