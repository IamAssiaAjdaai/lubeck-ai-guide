import { describe, expect, it } from "vitest";

import {
  MEDIA_SIZE_LIMITS,
  matchesMagicBytes,
  sanitizeOriginalFilename,
  validateUploadedObject,
  validateUploadIntent,
} from "@/lib/media/policy";

describe("media upload policy", () => {
  it("accepts supported image metadata and strips path traversal from display metadata", () => {
    expect(sanitizeOriginalFilename("../../photos/gate.jpg")).toBe("gate.jpg");
    expect(validateUploadIntent({ cityId: 1, kind: "image", originalFilename: "../../gate.jpg", mimeType: "image/jpeg", sizeBytes: 100 })).toMatchObject({ originalFilename: "gate.jpg" });
  });

  it("rejects unsupported and dangerous MIME types", () => {
    for (const mimeType of ["image/svg+xml", "text/html", "application/javascript", "application/zip"]) {
      expect(() => validateUploadIntent({ cityId: 1, kind: "image", originalFilename: "file.svg", mimeType, sizeBytes: 100 })).toThrow(/not allowed/);
    }
  });

  it("rejects extension spoofing and oversize files", () => {
    expect(() => validateUploadIntent({ cityId: 1, kind: "image", originalFilename: "payload.exe", mimeType: "image/jpeg", sizeBytes: 100 })).toThrow(/extension/);
    expect(() => validateUploadIntent({ cityId: 1, kind: "image", originalFilename: "huge.jpg", mimeType: "image/jpeg", sizeBytes: MEDIA_SIZE_LIMITS.image + 1 })).toThrow(/size limit/);
  });

  it("requires a supported exact locale for audio", () => {
    expect(() => validateUploadIntent({ cityId: 1, kind: "audio", originalFilename: "story.mp3", mimeType: "audio/mpeg", sizeBytes: 100 })).toThrow(/locale/);
    expect(() => validateUploadIntent({ cityId: 1, kind: "audio", originalFilename: "story.mp3", mimeType: "audio/mpeg", sizeBytes: 100, locale: "xx" as "en" })).toThrow(/locale/);
    expect(validateUploadIntent({ cityId: 1, kind: "audio", originalFilename: "story.mp3", mimeType: "audio/mpeg", sizeBytes: 100, locale: "ar" }).locale).toBe("ar");
  });

  it("recognizes supported file signatures", () => {
    expect(matchesMagicBytes("image/jpeg", Uint8Array.from([0xff, 0xd8, 0xff]))).toBe(true);
    expect(matchesMagicBytes("image/png", Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
    expect(matchesMagicBytes("audio/mpeg", new TextEncoder().encode("ID3test"))).toBe(true);
    expect(matchesMagicBytes("application/pdf", new TextEncoder().encode("%PDF-1.7"))).toBe(true);
    expect(matchesMagicBytes("video/webm", Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3]))).toBe(true);
  });

  it("rejects size, content-type and magic-byte mismatches at finalize", () => {
    const expected = { kind: "image" as const, mimeType: "image/jpeg", sizeBytes: 3 };
    expect(() => validateUploadedObject(expected, { sizeBytes: 4, mimeType: "image/jpeg", initialBytes: Uint8Array.from([0xff, 0xd8, 0xff]) })).toThrow(/size/);
    expect(() => validateUploadedObject(expected, { sizeBytes: 3, mimeType: "image/png", initialBytes: Uint8Array.from([0xff, 0xd8, 0xff]) })).toThrow(/content type/);
    expect(() => validateUploadedObject(expected, { sizeBytes: 3, mimeType: "image/jpeg", initialBytes: new TextEncoder().encode("bad") })).toThrow(/declared type/);
  });
});

