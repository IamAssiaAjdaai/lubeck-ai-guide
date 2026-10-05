import { describe, expect, it } from "vitest";

import {
  approvedStoreUrl,
  buildCitywalkSchemeUrl,
  buildNativeAppHandoffPath,
} from "@/lib/nativeAppHandoff";

describe("native app handoff", () => {
  it("builds a stable app-link path and preserves Marketing attribution", () => {
    expect(buildNativeAppHandoffPath({
      citySlug: "lubeck",
      marketingSlug: "2-hours",
      attribution: {
        source: "instagram",
        medium: "social",
        campaign: "two-hours-in-lubeck",
        contentId: "CW-LUB-TIME-001",
      },
    })).toBe(
      "/open/lubeck/2-hours?intent=build_walk&utm_source=instagram&utm_medium=social&utm_campaign=two-hours-in-lubeck&utm_content=CW-LUB-TIME-001",
    );
  });

  it("creates a custom-scheme fallback for installed apps", () => {
    expect(buildCitywalkSchemeUrl({
      citySlug: "lubeck",
      marketingSlug: "2-hours",
      attribution: { source: "instagram" },
    })).toBe("citywalk://open/lubeck/2-hours?intent=build_walk&utm_source=instagram");
  });

  it("accepts only credential-free HTTPS store URLs", () => {
    expect(approvedStoreUrl("https://apps.apple.com/app/id123")).toBe(
      "https://apps.apple.com/app/id123",
    );
    expect(approvedStoreUrl("http://apps.example.test/app")).toBeUndefined();
    expect(approvedStoreUrl("https://user:pass@example.test/app")).toBeUndefined();
    expect(approvedStoreUrl("")).toBeUndefined();
  });
});
