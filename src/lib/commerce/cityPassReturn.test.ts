import { describe, expect, it } from "vitest";

import {
  createCityPassReturnPath,
  resolveCityPassReturnPath,
} from "@/lib/commerce/cityPassReturn";

describe("city pass return destinations", () => {
  it("creates an allowlisted localized premium destination", () => {
    expect(createCityPassReturnPath("de", "glandorps-gang")).toBe(
      "/de/lubeck/glandorps-gang?premium=1#premium-audio",
    );
  });

  it.each([
    "https://evil.example/de/lubeck/place?premium=1#premium-audio",
    "//evil.example/path",
    "/en/lubeck/place?premium=1#premium-audio",
    "/de/berlin/place?premium=1#premium-audio",
    "/de/lubeck/../../admin?premium=1#premium-audio",
  ])("rejects malformed or external destination %s", (value) => {
    expect(resolveCityPassReturnPath(value, "de")).toBe("/de/lubeck");
  });
});

