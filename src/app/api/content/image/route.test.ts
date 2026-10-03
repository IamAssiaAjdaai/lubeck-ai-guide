import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { cities } from "@/data/cities";
import { GET } from "@/app/api/content/image/route";

describe("legacy public image variants", () => {
  it("redirects allowlisted CITYWALK legacy images to their static source", async () => {
    const source = encodeURIComponent(cities.lubeck.heroImage);
    const response = await GET(new Request(
      `https://citywalk.example/api/content/image?source=${source}&variant=card`,
    ));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      new URL(cities.lubeck.heroImage, "https://citywalk.example").toString(),
    );
    expect(response.headers.get("cache-control")).toContain("s-maxage=604800");
  });

  it("fails closed for arbitrary paths and unsupported variants", async () => {
    const arbitrary = await GET(new Request(
      "https://citywalk.example/api/content/image?source=/.env.local&variant=card",
    ));
    const invalidVariant = await GET(new Request(
      `https://citywalk.example/api/content/image?source=${encodeURIComponent(cities.lubeck.heroImage)}&variant=original`,
    ));

    expect(arbitrary.status).toBe(404);
    expect(invalidVariant.status).toBe(404);
  });
});
