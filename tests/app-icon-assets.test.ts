import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function readPng(relativePath: string) {
  const bytes = readFileSync(resolve(process.cwd(), relativePath));
  expect(bytes.subarray(0, 8)).toEqual(PNG_SIGNATURE);
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    hasTransparencyChunk: bytes.includes(Buffer.from("tRNS")),
  };
}

describe("CITYWALK raster app-icon assets", () => {
  it("ships a 1024px opaque launcher icon", () => {
    expect(readPng("mobile/assets/images/icon.png")).toEqual({
      width: 1024,
      height: 1024,
      hasTransparencyChunk: false,
    });
  });

  it("ships 1024px transparent Android foreground and monochrome layers", () => {
    expect(readPng("mobile/assets/images/android-icon-foreground.png")).toEqual({
      width: 1024,
      height: 1024,
      hasTransparencyChunk: true,
    });
    expect(readPng("mobile/assets/images/android-icon-monochrome.png")).toEqual({
      width: 1024,
      height: 1024,
      hasTransparencyChunk: true,
    });
  });

  it("keeps the adaptive background as an opaque 1024px brand canvas", () => {
    expect(readPng("mobile/assets/images/android-icon-background.png")).toEqual({
      width: 1024,
      height: 1024,
      hasTransparencyChunk: false,
    });
  });
});
