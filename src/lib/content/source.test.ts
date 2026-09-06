import { describe, expect, it } from "vitest";

import { getContentSource } from "@/lib/content/source";

describe("content source selection", () => {
  it("defaults safely to canonical code", () => {
    expect(getContentSource({})).toBe("code");
  });

  it.each(["auto", "database", "code"] as const)(
    "accepts %s",
    (source) =>
      expect(getContentSource({ CITYWALK_CONTENT_SOURCE: source })).toBe(source),
  );

  it("fails closed for unknown and public-prefixed values", () => {
    expect(() =>
      getContentSource({ CITYWALK_CONTENT_SOURCE: "partial" }),
    ).toThrow(/auto, database, or code/);
    expect(getContentSource({ NEXT_PUBLIC_CITYWALK_CONTENT_SOURCE: "database" })).toBe(
      "code",
    );
  });
});
