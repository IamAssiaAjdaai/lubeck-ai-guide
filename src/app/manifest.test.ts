import { describe, expect, it } from "vitest";

import manifest from "./manifest";

describe("CITYWALK web app identity", () => {
  it("publishes the approved brand colors and installable icon set", () => {
    const value = manifest();

    expect(value).toMatchObject({
      name: "CITYWALK – AI Walking Guide",
      short_name: "CITYWALK",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#FAFAF8",
      theme_color: "#0E2C44",
    });
    expect(value.icons).toEqual([
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ]);
  });
});
