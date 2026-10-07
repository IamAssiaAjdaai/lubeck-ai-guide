import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function readPng(relativePath: string) {
  const bytes = readFileSync(resolve(process.cwd(), relativePath));
  expect(bytes.subarray(0, 8)).toEqual(PNG_SIGNATURE);

  const idat: Buffer[] = [];
  let hasTransparencyChunk = false;
  let sawEnd = false;
  let offset = 8;
  while (offset < bytes.length) {
    expect(offset + 12).toBeLessThanOrEqual(bytes.length);
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const next = dataEnd + 4;
    expect(next).toBeLessThanOrEqual(bytes.length);

    if (type === "IDAT") idat.push(bytes.subarray(dataStart, dataEnd));
    if (type === "tRNS") hasTransparencyChunk = true;
    if (type === "IEND") sawEnd = true;
    offset = next;
  }

  expect(sawEnd).toBe(true);
  expect(idat.length).toBeGreaterThan(0);
  expect(() => inflateSync(Buffer.concat(idat))).not.toThrow();

  const colorType = bytes[25];
  const hasTransparency =
    colorType === 4 || colorType === 6 || hasTransparencyChunk;

  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    hasTransparency,
  };
}

describe("CITYWALK raster app-icon assets", () => {
  it("ships a decodable 1024px opaque launcher icon", () => {
    expect(readPng("mobile/assets/images/icon.png")).toEqual({
      width: 1024,
      height: 1024,
      hasTransparency: false,
    });
  });

  it("ships decodable 1024px transparent Android foreground and monochrome layers", () => {
    expect(readPng("mobile/assets/images/android-icon-foreground.png")).toEqual({
      width: 1024,
      height: 1024,
      hasTransparency: true,
    });
    expect(readPng("mobile/assets/images/android-icon-monochrome.png")).toEqual({
      width: 1024,
      height: 1024,
      hasTransparency: true,
    });
  });

  it("keeps the adaptive background as a decodable opaque 1024px brand canvas", () => {
    expect(readPng("mobile/assets/images/android-icon-background.png")).toEqual({
      width: 1024,
      height: 1024,
      hasTransparency: false,
    });
  });

  it("ships a decodable compact opaque Apple web-app icon for Next metadata", () => {
    expect(readPng("src/app/apple-icon.png")).toEqual({
      width: 180,
      height: 180,
      hasTransparency: false,
    });
  });
});
