import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(
  path.join(process.cwd(), "src/app/city/[citySlug]/place/[placeSlug].tsx"),
  "utf8",
);

describe("Premium audio P3", () => {
  it("only mounts the native player for verified Premium access", () => {
    expect(source).toMatch(/audio && premium\.active \? \(/);
    expect(source).toMatch(/usePremiumAccess\(\)/);
    expect(source).toMatch(/testID="premium-audio-locked"/);
  });

  it("routes locked audio to Premium without hiding missing-audio state", () => {
    expect(source).toMatch(/<Link href="\/premium" asChild>/);
    expect(source).toMatch(/translate\(locale, "profile\.explorePass"\)/);
    expect(source).toMatch(/audio-unavailable-notice/);
    expect(source).toMatch(/premium\.status !== "loading"/);
  });

  it("keeps the existing localized narration player for Premium", () => {
    expect(source).toMatch(/source=\{citywalkApi\.resolveUrl\(audio\.url\)\}/);
    expect(source).toMatch(/durationSeconds=\{audio\.durationSeconds\}/);
    expect(source).toMatch(/assetLocale=\{audio\.locale\}/);
  });
});
