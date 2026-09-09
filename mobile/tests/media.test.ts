import { describe, expect, it } from "vitest";

import { selectPrimaryImage } from "../src/lib/api/media";

describe("native public media selection", () => {
  it("uses approved public API card/hero media before legacy fallback", () => {
    const media = [
      { assetKey: "hero", kind: "image", purpose: "hero", url: "/api/media/hero", mimeType: "image/jpeg" },
      { assetKey: "card", kind: "image", purpose: "card", url: "/api/media/card", mimeType: "image/jpeg" },
    ] as const;
    expect(selectPrimaryImage(media, "/legacy.jpg")).toBe("/api/media/card");
    expect(selectPrimaryImage(media.slice(0, 1), "/legacy.jpg")).toBe("/api/media/hero");
    expect(selectPrimaryImage([], "/legacy.jpg")).toBe("/legacy.jpg");
  });
});
