import { describe, expect, it } from "vitest";

import {
  getNativeDirection,
  getNativeMessages,
  getNativeTextAlignment,
} from "../src/lib/localization";

describe("native localization foundation", () => {
  it("provides English, German, and Arabic messages", () => {
    expect(getNativeMessages("en").discoverCities).toBeTruthy();
    expect(getNativeMessages("de").discoverCities).toBeTruthy();
    expect(getNativeMessages("ar").discoverCities).toBeTruthy();
    for (const locale of ["en", "de", "ar"] as const) {
      expect(getNativeMessages(locale)).toMatchObject({
        guideWelcome: expect.any(String),
        guideThinking: expect.any(String),
        guideQuestionRemaining: expect.any(String),
        guideQuestionsRemaining: expect.stringContaining("{count}"),
        guideAbuseLimited: expect.any(String),
      });
    }
  });

  it("matches the web Home product copy in every native locale", () => {
    expect(getNativeMessages("en")).toMatchObject({
      homeHeroTitle: "Discover cities one step at a time.",
      homeHeroSubtitle: "Explore local stories, audio guides and hidden places in your language.",
      discoverCity: "Discover a city",
      noSignUpRequired: "No sign-up required",
    });
    expect(getNativeMessages("de")).toMatchObject({
      homeHeroTitle: "Städte entdecken, Schritt für Schritt.",
      discoverCity: "Entdecke eine Stadt",
    });
    expect(getNativeMessages("ar")).toMatchObject({
      homeHeroTitle: "اكتشف المدن خطوة بخطوة.",
      discoverCity: "اكتشف مدينة",
    });
  });

  it("uses RTL only for Arabic in the initial native locale set", () => {
    expect(getNativeDirection("ar")).toBe("rtl");
    expect(getNativeDirection("de")).toBe("ltr");
    expect(getNativeDirection("en")).toBe("ltr");
    expect(getNativeTextAlignment("ar")).toBe("right");
    expect(getNativeTextAlignment("en")).toBe("left");
  });
});
