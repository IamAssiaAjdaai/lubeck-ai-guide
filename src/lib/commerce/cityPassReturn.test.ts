import { describe, expect, it } from "vitest";

import {
  createCityPassReturnPath,
  parseCityPassReturnPath,
  resolveCityPassReturnPath,
} from "@/lib/commerce/cityPassReturn";

describe("city pass return destinations", () => {
  it("creates an allowlisted localized destination for any valid city", () => {
    expect(
      createCityPassReturnPath("de", "lubeck", "glandorps-gang"),
    ).toBe("/de/lubeck/glandorps-gang?premium=1#premium-audio");
    expect(createCityPassReturnPath("en", "test-city", "museum")).toBe(
      "/en/test-city/museum?premium=1#premium-audio",
    );
  });

  it.each([
    "https://evil.example/de/lubeck/place?premium=1#premium-audio",
    "//evil.example/path",
    "/en/lubeck/place?premium=1#premium-audio",
    "/de/lubeck/../../admin?premium=1#premium-audio",
  ])("rejects malformed or external destination %s", (value) => {
    expect(resolveCityPassReturnPath(value, "de")).toBe("/de");
  });

  it("parses a safe city-scoped intent without treating it as access authority", () => {
    expect(
      parseCityPassReturnPath(
        "/en/test-city/museum?premium=1#premium-audio",
        "en",
      ),
    ).toEqual({
      path: "/en/test-city/museum?premium=1#premium-audio",
      citySlug: "test-city",
      placeSlug: "museum",
    });
  });
});
