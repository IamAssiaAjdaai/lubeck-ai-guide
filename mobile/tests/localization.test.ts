import { describe, expect, it } from "vitest";

import { getNativeDirection, getNativeMessages } from "../src/lib/localization";

describe("native localization foundation", () => {
  it("provides English, German, and Arabic messages", () => {
    expect(getNativeMessages("en").discoverCities).toBeTruthy();
    expect(getNativeMessages("de").discoverCities).toBeTruthy();
    expect(getNativeMessages("ar").discoverCities).toBeTruthy();
  });

  it("uses RTL only for Arabic in the initial native locale set", () => {
    expect(getNativeDirection("ar")).toBe("rtl");
    expect(getNativeDirection("de")).toBe("ltr");
    expect(getNativeDirection("en")).toBe("ltr");
  });
});
