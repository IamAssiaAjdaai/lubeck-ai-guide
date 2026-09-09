import { describe, expect, it } from "vitest";

import {
  DEFAULT_CITYWALK_MAP_STYLE_URL,
  resolveMapStyleUrl,
} from "../src/lib/mapStyle";

describe("native map style boundary", () => {
  it("reuses the approved CITYWALK Web map style by default", () => {
    expect(resolveMapStyleUrl()).toBe(DEFAULT_CITYWALK_MAP_STYLE_URL);
    expect(DEFAULT_CITYWALK_MAP_STYLE_URL).toBe(
      "https://tiles.openfreemap.org/styles/liberty",
    );
  });

  it("accepts an explicitly configured HTTPS provider style", () => {
    expect(resolveMapStyleUrl("https://maps.citywalk.example/styles/main.json"))
      .toBe("https://maps.citywalk.example/styles/main.json");
  });

  it("rejects insecure or credential-bearing style URLs", () => {
    expect(() => resolveMapStyleUrl("http://maps.citywalk.example/style.json"))
      .toThrow("must use HTTPS");
    expect(() => resolveMapStyleUrl("https://token:secret@maps.citywalk.example/style.json"))
      .toThrow("must not contain URL credentials");
  });
});
