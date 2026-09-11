import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { applicationMediaPath, resolvePlaceMedia } from "@/lib/media/publicMedia.server";
import type { PublicMedia } from "@/lib/media/types";
import { toLocalizedPublicCityResponse } from "@/lib/content/publicRepository.server";

const englishAudio: PublicMedia = { assetKey: "a", kind: "audio", purpose: "audio", url: "https://cdn.example/en.mp3", mimeType: "audio/mpeg", locale: "en" };

describe("public media legacy migration", () => {
  it("uses stable application delivery paths without storage details", () => {
    expect(applicationMediaPath("asset-key")).toBe("/api/media/asset-key");
  });

  it("prefers approved CMS media and otherwise keeps legacy media", () => {
    const place = { image: "/legacy.jpg", audio: { en: "/legacy-en.mp3", ar: "/legacy-ar.mp3" } };
    expect(resolvePlaceMedia(place, [{ assetKey: "i", kind: "image", purpose: "hero", url: "https://cdn.example/hero.jpg", mimeType: "image/jpeg" }], "en").image).toBe("https://cdn.example/hero.jpg");
    expect(resolvePlaceMedia(place, [], "en")).toMatchObject({ image: "/legacy.jpg", audio: "/legacy-en.mp3" });
  });

  it("never masquerades English audio as Arabic", () => {
    const place = { audio: { ar: "/approved-legacy-ar.mp3" } };
    expect(resolvePlaceMedia(place, [englishAudio], "ar").audio).toBe("/approved-legacy-ar.mp3");
    expect(resolvePlaceMedia({}, [englishAudio], "ar").audio).toBeUndefined();
    const response = toLocalizedPublicCityResponse({
      city: { slug: "test", content: { ar: { name: "اختبار" } } },
      places: [],
      tours: [],
      media: { city: [englishAudio], places: {}, tours: {} },
    }, "ar");
    expect(response.city.media).toEqual([]);
  });

  it("exposes required attribution without leaking internal rights evidence", () => {
    const media = {
      assetKey: "licensed-image",
      kind: "image" as const,
      purpose: "hero" as const,
      url: "/api/media/licensed-image",
      mimeType: "image/jpeg",
      attribution: {
        text: "Photo: Example Photographer",
        creator: "Example Photographer",
      },
      evidenceReference: "Private contract 42",
      verifiedByUserId: "reviewer-1",
      rightsNotes: "Internal only",
    };
    const response = toLocalizedPublicCityResponse({
      city: { slug: "test", content: { en: { name: "Test" } } },
      places: [],
      tours: [],
      media: { city: [media], places: {}, tours: {} },
    }, "en");

    expect(response.city.media[0]?.attribution).toEqual(media.attribution);
    expect(JSON.stringify(response)).not.toMatch(
      /evidenceReference|verifiedByUserId|rightsNotes|Private contract|Internal only/,
    );
  });
});
