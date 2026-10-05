import { describe, expect, it } from "vitest";

import {
  getMarketingPageTransition,
  getMarketingSocialTransition,
  isMarketingPageState,
  isMarketingSocialState,
} from "@/lib/admin/marketing/workflow";

describe("Marketing workflow", () => {
  it("keeps page review and publishing permissions separated", () => {
    expect(getMarketingPageTransition("draft", "in_review")).toMatchObject({
      label: "Submit for review",
      capability: "marketing:manage",
    });
    expect(getMarketingPageTransition("in_review", "approved")).toMatchObject({
      capability: "publishing:review",
    });
    expect(getMarketingPageTransition("approved", "published")).toMatchObject({
      capability: "publishing:publish",
    });
    expect(getMarketingPageTransition("draft", "published")).toBeUndefined();
  });

  it("requires social content to become ready before it is marked published", () => {
    expect(getMarketingSocialTransition("approved", "ready")).toMatchObject({
      label: "Mark ready",
      capability: "publishing:publish",
    });
    expect(getMarketingSocialTransition("ready", "published")).toMatchObject({
      label: "Mark published",
      capability: "publishing:publish",
    });
    expect(getMarketingSocialTransition("approved", "published")).toBeUndefined();
  });

  it("recognizes only supported workflow states", () => {
    expect(isMarketingPageState("in_review")).toBe(true);
    expect(isMarketingPageState("ready")).toBe(false);
    expect(isMarketingSocialState("ready")).toBe(true);
    expect(isMarketingSocialState("paused")).toBe(false);
  });
});
