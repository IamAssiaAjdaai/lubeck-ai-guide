import { describe, expect, it } from "vitest";
import { explorePhotography } from "../src/lib/explorePhotography";
import type { PublicPlaceCard } from "../src/lib/api/contracts";
const place = (slug: string, extra: Partial<PublicPlaceCard> = {}) => ({ slug, media: [], ...extra }) as PublicPlaceCard;

describe("Explore place-specific photography", () => {
  it("uses the matching licensed Holstentor photo with accurate credits", () => {
    const result = explorePhotography("lubeck", place("holstentor"));
    expect(result?.credit?.credit).toContain("Christian Wolf");
    expect(result?.credit?.licenseName).toBe("CC BY-SA 3.0 DE");
    expect(result?.source).toBeTruthy();
  });
  it("does not substitute the landmark for another place or city", () => {
    expect(explorePhotography("hamburg", place("holstentor"))).toBeUndefined();
    expect(explorePhotography("lubeck", place("marienkirche"))).toBeUndefined();
  });
  it("does not silently present legacy images lacking source/license records", () => {
    expect(explorePhotography("lubeck", place("marienkirche", { image: "/landmarks/marienkirche.jpg" }))).toBeUndefined();
  });
  it("prefers public approved media and preserves its attribution", () => {
    const attribution = { text: "Photo: Example · CC BY 4.0" };
    const media: PublicPlaceCard["media"] = [{ assetKey: "own-place", mimeType: "image/jpeg", kind: "image", purpose: "card", url: "/api/media/own-place", variants: { thumbnail: "/api/media/thumb", card: "/api/media/own-card", detail: "/api/media/detail", hero: "/api/media/hero" }, attribution }];
    expect(explorePhotography("other-city", place("own-place", { media }))).toEqual({ uri: "/api/media/own-card", attribution });
  });
});
