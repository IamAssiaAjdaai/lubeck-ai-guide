import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getGuideEligibility: vi.fn(),
}));

vi.mock("@/lib/guideEligibility.server", () => mocks);

import { GET } from "@/app/api/guide/eligibility/route";

describe("GET /api/guide/eligibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getGuideEligibility.mockResolvedValue(true);
  });

  it("reuses the server-owned guide eligibility boundary", async () => {
    const response = await GET(new Request(
      "https://citywalk.example/api/guide/eligibility?citySlug=lubeck&placeSlug=holstentor",
    ));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({ eligible: true });
    expect(mocks.getGuideEligibility).toHaveBeenCalledWith({
      citySlug: "lubeck",
      placeSlug: "holstentor",
    });
  });

  it("returns an inactive CTA state without exposing repository details", async () => {
    mocks.getGuideEligibility.mockResolvedValue(false);
    const response = await GET(new Request(
      "https://citywalk.example/api/guide/eligibility?citySlug=hamburg&placeSlug=city-hall",
    ));

    await expect(response.json()).resolves.toEqual({ eligible: false });
  });

  it.each([
    "?citySlug=lubeck",
    "?placeSlug=holstentor",
    "?citySlug=../admin&placeSlug=holstentor",
  ])("rejects malformed public route identity: %s", async (query) => {
    const response = await GET(new Request(
      `https://citywalk.example/api/guide/eligibility${query}`,
    ));

    expect(response.status).toBe(400);
    expect(mocks.getGuideEligibility).not.toHaveBeenCalled();
  });
});
