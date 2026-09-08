import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAsset: vi.fn(),
  requirePass: vi.fn(),
  deliver: vi.fn(),
}));

vi.mock("@/lib/auth/server", () => ({
  auth: { api: { getSession: mocks.getSession } },
}));
vi.mock("@/lib/commerce/premiumMedia.server", () => ({
  getPremiumMediaDeliveryAsset: mocks.getAsset,
}));
vi.mock("@/lib/commerce/cityPassAccess.server", () => ({
  requireCityPass: mocks.requirePass,
}));
vi.mock("@/lib/media/mediaDelivery.server", () => ({
  deliverPrivateMediaObject: mocks.deliver,
  mediaUnavailableResponse: () => new Response("Media not found.", { status: 404 }),
}));

import { GET } from "@/app/api/commerce/media/[assetKey]/route";

const context = {
  params: Promise.resolve({ assetKey: "123e4567-e89b-42d3-a456-426614174000" }),
};

describe("premium media delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAsset.mockResolvedValue({
      objectKey: "private/internal-object.mp3",
      mimeType: "audio/mpeg",
      sizeBytes: 1234,
      citySlug: "lubeck",
    });
    mocks.requirePass.mockResolvedValue(undefined);
    mocks.deliver.mockResolvedValue(new Response("audio", { status: 200 }));
  });

  it("denies unauthenticated direct access without resolving the private asset", async () => {
    mocks.getSession.mockResolvedValue(null);
    const response = await GET(new Request("https://citywalk.example/api/commerce/media/key"), context);
    expect(response.status).toBe(404);
    expect(mocks.getAsset).not.toHaveBeenCalled();
    expect(mocks.deliver).not.toHaveBeenCalled();
  });

  it("denies a signed-in traveler without an active city entitlement", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.requirePass.mockRejectedValue(new Error("CITY_PASS_REQUIRED"));
    const response = await GET(new Request("https://citywalk.example/api/commerce/media/key"), context);
    expect(response.status).toBe(404);
    expect(mocks.deliver).not.toHaveBeenCalled();
  });

  it("streams only after the authenticated city entitlement is verified", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "user-1" } });
    const request = new Request("https://citywalk.example/api/commerce/media/key");
    const response = await GET(request, context);
    expect(response.status).toBe(200);
    expect(mocks.requirePass).toHaveBeenCalledWith({
      userId: "user-1",
      citySlug: "lubeck",
    });
    expect(mocks.deliver).toHaveBeenCalledWith(
      request,
      expect.objectContaining({ sizeBytes: 1234 }),
      "Premium media",
    );
    expect(await response.text()).toBe("audio");
    expect(response.headers.get("location")).toBeNull();
  });
});

