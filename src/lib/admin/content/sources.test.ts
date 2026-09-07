import { describe, expect, it } from "vitest";

import { validateContentSourceInput } from "@/lib/admin/content/sources";

describe("canonical content sources", () => {
  it("validates source metadata without accepting markup or duplicate localization ownership", () => {
    expect(validateContentSourceInput({
      publisher: "City of Lübeck",
      title: "Visitor information",
      canonicalUrl: "https://WWW.LUEBECK.DE/place/",
      verifiedAt: "2026-09-01",
    })).toEqual({
      publisher: "City of Lübeck",
      title: "Visitor information",
      canonicalUrl: "https://www.luebeck.de/place",
      verifiedAt: "2026-09-01",
      validUntil: undefined,
      notes: undefined,
    });
  });

  it("rejects unsupported URL protocols and inverted validity windows", () => {
    expect(() => validateContentSourceInput({
      publisher: "Unsafe",
      title: "Unsafe",
      canonicalUrl: "javascript:alert(1)",
      verifiedAt: "2026-09-01",
    })).toThrow("canonicalUrl");
    expect(() => validateContentSourceInput({
      publisher: "Source",
      title: "Source",
      canonicalUrl: "https://example.com",
      verifiedAt: "2026-09-02",
      validUntil: "2026-09-01",
    })).toThrow("validUntil cannot be before verifiedAt");
  });
});
