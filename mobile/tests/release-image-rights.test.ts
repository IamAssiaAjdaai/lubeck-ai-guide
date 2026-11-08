import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { explorePhotography } from "../src/lib/explorePhotography";
import type { PublicPlaceCard } from "../src/lib/api/contracts";
import { describe, expect, it } from "vitest";
import type { PublicMedia } from "../src/lib/api/contracts";
import { selectPrimaryImageMedia, selectImageUrl, selectExactLocaleAudio } from "../src/lib/releasePhotography";
import { selectExactLocaleAudio as originalAudio } from "../src/lib/api/media";

const root = fileURLToPath(new URL("../../", import.meta.url));
const mobile = resolve(root, "mobile");
const quarantined = ["home-holstentor.jpg", "home-multicity-approved.webp", "city-hub-lubeck-approved.webp", "citywalk-hero.png"];
const quarantinedHashes = new Set(["078d8d067bb6cd053c40c9a16092512838d893ee92af26ca2ad52487ab48294b", "22257df1777b146f93c6a4bd6a79fa1e8960630263822ec9a01dd13c4a0a75e3", "4d7169e2797941e998b4199339277eebe6744bec163c5edb885a256102ed8f96", "5910cc59d4219839ed947ce8e1b799027ee6d399a74d3dad2faed50b8286c429", "698969eb8cbc392a9640131c0030373c2e1e37326895f9e72ce04b8f7ec2f45c", "6d9d8bc2d18f62cdc023ae9ffc36cda503ff92023017aba33b7dd88458530011", "ae476b3fe282d6b1eaba0b99afbf46001ba32c04a17d650377bb24d5e7ef6ba7", "c0674ba03232a8047fa11631af3a5362e347fcdc1a6e9401f03083fbf44494fc"]);
const legacy = ["holstentor", "marienkirche", "rathaus", "heiligen-geist-hospital", "buddenbrookhaus"];
const media: PublicMedia = { assetKey: "published-but-not-release-cleared", kind: "image", purpose: "hero", mimeType: "image/jpeg", url: "/api/media/published", variants: { thumbnail: "/api/media/thumb", card: "/api/media/card", detail: "/api/media/detail", hero: "/api/media/hero" }, attribution: { text: "Christian Wolf · CC BY-SA 3.0 DE", creator: "Christian Wolf" } };

describe("release image rights fail closed until an approved hashed manifest exists", () => {
  it.each(["hero", "card", "gallery", "thumbnail"] as const)("blocks CMS %s even when published with familiar credit text", purpose => {
    const candidate = { ...media, purpose };
    expect(selectPrimaryImageMedia([candidate])).toBeUndefined();
    expect(candidate.attribution).toBe(media.attribution);
  });
  it.each(["thumbnail", "card", "detail", "hero"] as const)("blocks CMS, cached and legacy %s URLs rather than treating publication as permission", use => {
    expect(selectImageUrl(media, undefined, undefined, use)).toBeUndefined();
    for (const slug of legacy) {
      const url = `/landmarks/${slug}.jpg`;
      expect(selectImageUrl(undefined, url, { thumbnail: url, card: url, detail: url, hero: url }, use)).toBeUndefined();
    }
  });
  it("leaves exact-locale audio selection and API media metadata untouched", () => {
    expect(selectExactLocaleAudio).toBe(originalAudio);
    const audio = { ...media, kind: "audio" as const, purpose: "audio" as const, locale: "en", url: "/api/media/audio" };
    expect(selectExactLocaleAudio([media, audio], "en")).toBe(audio);
    expect(selectExactLocaleAudio([media, audio], "de")).toBeUndefined();
  });
  it("keeps unverified rasters in history but removes every mobile static import/reference", () => {
    const files = readdirSync(resolve(mobile, "src"), { recursive: true }).filter((p): p is string => typeof p === "string" && /\.tsx?$/.test(p));
    for (const file of files) {
      const source = readFileSync(resolve(mobile, "src", file), "utf8");
      for (const name of quarantined) expect(source, `${file} references ${name}`).not.toContain(name);
      for (const match of source.matchAll(/["']([^"']+\.(?:png|jpe?g|webp|svg))["']/g)) {
        if (!match[1].startsWith(".")) continue;
        const path = resolve(dirname(resolve(mobile, "src", file)), match[1]);
        const hash = createHash("sha256").update(readFileSync(path)).digest("hex");
        expect(quarantinedHashes.has(hash), `${file} imports quarantined bytes via ${match[1]}`).toBe(false);
      }
      // Every image-selection consumer must pass the release gate, not the generic DTO helper.
      if (file !== "lib/releasePhotography.ts" && /selectPrimaryImageMedia|selectImageUrl/.test(source)) {
        expect(source, file).not.toMatch(/from ["'][^"']*api\/media["']/);
      }
    }
  });
  it("quarantines unsafe source-archive files while retaining verified photo imports", () => {
    const rules = readFileSync(resolve(root, ".easignore"), "utf8");
    expect(rules.split("\n")).toContain("/public/landmarks/**");
    expect(rules.split("\n")).toContain("/public/images/citywalk-hero.png");
    for (const name of quarantined) expect(rules.split("\n")).toContain(`/mobile/assets/images/${name}`);
    const home = readFileSync(resolve(mobile, "src/app/index.tsx"), "utf8");
    expect(home).toContain('case "lubeck": return selectionLubeck');
    expect(home).toContain('introduction-holstentor.jpg');
    expect(home).toContain('<CityPhotoCredits cityName={cityName} photo={selectionCredit} />');
    expect(home).not.toContain('citywalkApi.resolveUrl');
    const itinerary = readFileSync(resolve(mobile, "src/components/V2Presentation.tsx"), "utf8");
    expect(itinerary).toContain('cityHubBundledPhoto(citySlug, place.slug)');
    expect(itinerary).toContain('<PlacePhotoCredit credit={photo.credit} />');
    expect(itinerary).not.toContain('place.image');
  });
  it("retains a missing-photo result for all 20 canonical POIs without a static photograph", () => {
    const source = readFileSync(resolve(root, "src/data/places.ts"), "utf8");
    const list = source.match(/export const LUBECK_PLACE_SLUGS = \[([\s\S]*?)\] as const/)![1];
    const slugs = [...list.matchAll(/"([^"]+)"/g)].map(match => match[1]).filter(slug => !legacy.includes(slug));
    expect(slugs).toHaveLength(20);
    for (const slug of slugs) {
      expect(explorePhotography("lubeck", { slug, media: [media], category: "see", coordinates: { lat: 0, lng: 0 }, durationMinutes: 10, requestedLocale: "en", resolvedLocale: "en", didFallback: false, content: { name: slug, shortDescription: "Test fixture" } } satisfies PublicPlaceCard)).toBeUndefined();
    }
  });

});
