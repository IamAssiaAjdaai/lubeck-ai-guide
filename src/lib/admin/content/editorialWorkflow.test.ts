import { describe, expect, it } from "vitest";

import {
  EDITORIAL_TRANSITIONS,
  EDITORIAL_WORKFLOW_STATES,
  getEditorialTransition,
  isRequiredSourceValid,
  normalizeCanonicalSourceUrl,
} from "@/lib/admin/content/editorialWorkflow";

describe("editorial workflow", () => {
  it("defines the complete five-state domain", () => {
    expect(EDITORIAL_WORKFLOW_STATES).toEqual([
      "draft",
      "in_review",
      "approved",
      "published",
      "archived",
    ]);
  });

  it("allows explicit review/publish/archive transitions without shortcuts", () => {
    expect(getEditorialTransition("draft", "in_review")?.action).toBe("submitted_for_review");
    expect(getEditorialTransition("in_review", "approved")?.action).toBe("approved");
    expect(getEditorialTransition("approved", "published")?.action).toBe("published");
    expect(getEditorialTransition("published", "archived")?.action).toBe("archived");
    expect(getEditorialTransition("archived", "draft")?.action).toBe("returned_to_draft");
    expect(getEditorialTransition("draft", "published")).toBeUndefined();
    expect(getEditorialTransition("in_review", "published")).toBeUndefined();
    expect(EDITORIAL_TRANSITIONS).not.toContainEqual(
      expect.objectContaining({ from: "archived", to: "published" }),
    );
  });

  it("normalizes canonical source URLs deterministically", () => {
    expect(normalizeCanonicalSourceUrl(" HTTPS://Example.COM:443/path/#fragment "))
      .toBe("https://example.com/path");
    expect(normalizeCanonicalSourceUrl("https://example.com/path"))
      .toBe("https://example.com/path");
  });

  it("rejects future verification and expired required sources", () => {
    const today = new Date("2026-09-07T12:00:00.000Z");
    expect(isRequiredSourceValid({ verifiedAt: "2026-09-01" }, today)).toBe(true);
    expect(isRequiredSourceValid({ verifiedAt: "2026-09-08" }, today)).toBe(false);
    expect(isRequiredSourceValid({ verifiedAt: "2026-09-01", validUntil: "2026-09-06" }, today)).toBe(false);
    expect(isRequiredSourceValid({ verifiedAt: "2026-09-01", validUntil: "2026-09-07" }, today)).toBe(true);
  });
});
