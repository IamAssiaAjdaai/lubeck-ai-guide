import { describe, expect, it } from "vitest";

import { formatMediaAttribution } from "../src/lib/mediaAttribution";

describe("native media attribution", () => {
  it("replaces raw source and license URLs with compact tappable labels", () => {
    const segments = formatMediaAttribution({
      creator: "Example Photographer",
      text: "Photo: Example Photographer · https://commons.wikimedia.org/wiki/File:Example.jpg · CC BY-SA 3.0 · https://creativecommons.org/licenses/by-sa/3.0/",
    });

    expect(segments).toEqual([
      { label: "Photo: Example Photographer" },
      {
        label: "Wikimedia Commons",
        url: "https://commons.wikimedia.org/wiki/File:Example.jpg",
      },
      {
        label: "CC BY-SA 3.0",
        url: "https://creativecommons.org/licenses/by-sa/3.0/",
      },
    ]);
    expect(segments.map(({ label }) => label).join(" · ")).not.toContain("https://");
  });

  it("preserves supplied legal credit text and adds a missing creator credit", () => {
    expect(formatMediaAttribution({
      creator: "City Archive",
      text: "Licensed for CITYWALK editorial use",
    })).toEqual([
      { label: "Photo: City Archive" },
      { label: "Licensed for CITYWALK editorial use" },
    ]);
  });

  it("uses a readable host label for other public source URLs", () => {
    expect(formatMediaAttribution({ text: "https://images.example.org/photo/42" })).toEqual([
      {
        label: "images.example.org",
        url: "https://images.example.org/photo/42",
      },
    ]);
  });

  it("keeps one tappable Commons label when stored credit already names Commons", () => {
    expect(formatMediaAttribution({
      creator: "Example Photographer",
      text: "Photo: Example Photographer · Wikimedia Commons · https://commons.wikimedia.org/wiki/File:Example.jpg · CC BY-SA 4.0 · https://creativecommons.org/licenses/by-sa/4.0/",
    })).toEqual([
      { label: "Photo: Example Photographer" },
      { label: "Wikimedia Commons", url: "https://commons.wikimedia.org/wiki/File:Example.jpg" },
      { label: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/" },
    ]);
  });
});
