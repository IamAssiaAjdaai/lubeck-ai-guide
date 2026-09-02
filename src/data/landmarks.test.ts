import { describe, expect, it } from "vitest";

import { locales } from "@/lib/i18n";
import { landmarks } from "./landmarks";

describe("landmarks", () => {
  it("provides five complete landmarks in every locale", () => {
    expect(landmarks).toHaveLength(5);

    for (const landmark of landmarks) {
      for (const locale of locales) {
        const content = landmark.content[locale];
        expect(content.name).toBeTruthy();
        expect(content.duration).toBeTruthy();
        expect(content.description).toBeTruthy();
        expect(content.story).toBeTruthy();
        expect(content.facts).toHaveLength(3);
        expect(JSON.stringify(content)).not.toMatch(/TODO|Translation here/i);
      }
    }
  });

  it("does not invent audio paths for added locales", () => {
    for (const landmark of landmarks) {
      for (const locale of locales) {
        const audio = landmark.content[locale].audio;
        expect(audio === "" || audio.startsWith("/audio/")).toBe(true);
      }
    }
  });
});
