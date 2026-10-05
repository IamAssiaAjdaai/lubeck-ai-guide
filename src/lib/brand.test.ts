import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { CITYWALK_BRAND } from "@/lib/brand";

describe("CITYWALK Brand System", () => {
  it("keeps the approved product identity in one web source", () => {
    expect(CITYWALK_BRAND).toMatchObject({
      name: "CITYWALK",
      domain: "getcitywalk.com",
      socialHandle: "@getcitywalk",
      tagline: "Explore more. Plan less.",
      colors: {
        navy: "#0E2C44",
        teal: "#019FA3",
        canvas: "#FAFAF8",
        white: "#FFFFFF",
      },
    });
  });

  it("ships the approved pin-and-route mark instead of the legacy route artwork", () => {
    const mark = readFileSync(
      join(process.cwd(), "public/brand/citywalk-mark.svg"),
      "utf8",
    );

    expect(mark).toContain('viewBox="334 220 590 822"');
    expect(mark).toContain("citywalk-pin");
    expect(mark).toContain("citywalk-route");
    expect(mark).toContain("#00B2A7");
    expect(mark).not.toContain("<circle");
  });
});
