import { describe, expect, it } from "vitest";

import { decideMarketingAutomationReady } from "@/lib/admin/marketing/automationReady";

describe("decideMarketingAutomationReady", () => {
  it("treats ready as idempotent success", () => {
    expect(
      decideMarketingAutomationReady({
        status: "ready",
        platform: "instagram",
        validMediaCount: 1,
      }),
    ).toEqual({ action: "already_ready" });
  });

  it("allows approved Instagram content with valid media", () => {
    expect(
      decideMarketingAutomationReady({
        status: "approved",
        platform: "Instagram",
        validMediaCount: 2,
      }),
    ).toEqual({ action: "transition" });
  });

  it("rejects non-approved states", () => {
    expect(
      decideMarketingAutomationReady({
        status: "in_review",
        platform: "instagram",
        validMediaCount: 1,
      }),
    ).toEqual({ action: "reject", code: "INVALID_STATE" });
  });

  it("rejects unsupported platforms", () => {
    expect(
      decideMarketingAutomationReady({
        status: "approved",
        platform: "tiktok",
        validMediaCount: 1,
      }),
    ).toEqual({ action: "reject", code: "UNSUPPORTED_PLATFORM" });
  });

  it("requires at least one valid media attachment", () => {
    expect(
      decideMarketingAutomationReady({
        status: "approved",
        platform: "instagram",
        validMediaCount: 0,
      }),
    ).toEqual({ action: "reject", code: "MEDIA_REQUIRED" });
  });
});
