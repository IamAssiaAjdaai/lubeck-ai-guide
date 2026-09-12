import { describe, expect, it } from "vitest";

import { isApplicationMediaPath } from "@/lib/media/imageDelivery";

describe("application media image delivery", () => {
  it.each([
    "/api/media/0193c9be-62d1-7f9d-8ff2-08fc48fcb771",
    "/api/commerce/media/0193c9be-62d1-7f9d-8ff2-08fc48fcb771",
  ])("bypasses the optimizer for application-authorized media: %s", (source) => {
    expect(isApplicationMediaPath(source)).toBe(true);
  });

  it.each([
    "/images/holstentor.jpg",
    "https://images.example.test/city.jpg",
    "/api/media-preview/0193c9be-62d1-7f9d-8ff2-08fc48fcb771",
  ])("keeps normal image optimization for other sources: %s", (source) => {
    expect(isApplicationMediaPath(source)).toBe(false);
  });
});
