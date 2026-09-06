import { describe, expect, it } from "vitest";

import { parseExternalVideoUrl } from "@/lib/media/externalVideo";

describe("external video policy", () => {
  it("canonicalizes allowed YouTube URLs", () => {
    expect(parseExternalVideoUrl("https://youtu.be/dQw4w9WgXcQ?feature=share")).toEqual({ provider: "youtube", videoId: "dQw4w9WgXcQ", canonicalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" });
    expect(parseExternalVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ").videoId).toBe("dQw4w9WgXcQ");
  });

  it("canonicalizes allowed Vimeo URLs", () => {
    expect(parseExternalVideoUrl("https://player.vimeo.com/video/123456789")).toEqual({ provider: "vimeo", videoId: "123456789", canonicalUrl: "https://vimeo.com/123456789" });
  });

  it.each(["javascript:alert(1)", "<iframe src='https://youtube.com'></iframe>", "https://example.com/video", "https://youtube.com/watch?v=bad", "https://vimeo.com/not-a-number", "https://user:pass@youtube.com/watch?v=dQw4w9WgXcQ"])("rejects unsafe or malformed input %s", (value) => {
    expect(() => parseExternalVideoUrl(value)).toThrow();
  });
});
