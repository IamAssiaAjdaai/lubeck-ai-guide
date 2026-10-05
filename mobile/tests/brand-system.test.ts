import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { citywalkBrand } from "../src/design/brand";

describe("native CITYWALK Brand System", () => {
  it("matches the approved identity used by the web product", () => {
    expect(citywalkBrand).toEqual({
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

  it("uses the approved pin-and-route asset in native chrome", () => {
    const mark = readFileSync(
      join(process.cwd(), "assets/images/citywalk-mark.svg"),
      "utf8",
    );

    expect(mark).toContain('viewBox="334 220 590 822"');
    expect(mark).toContain("citywalk-pin");
    expect(mark).toContain("citywalk-route");
    expect(mark).not.toContain("M3 38l8-2");
  });
});
