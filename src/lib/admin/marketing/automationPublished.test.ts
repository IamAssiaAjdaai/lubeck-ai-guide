import { describe, expect, it } from "vitest";

import { decideMarketingAutomationPublished } from "@/lib/admin/marketing/automationPublished";

describe("decideMarketingAutomationPublished", () => {
  it("allows ready content with a valid HTTPS published URL", () => {
    expect(
      decideMarketingAutomationPublished({
        status: "ready",
        requestedPublishedUrl: "https://www.instagram.com/p/example",
      }),
    ).toEqual({
      action: "transition",
      publishedUrl: "https://www.instagram.com/p/example",
    });
  });

  it("normalizes valid HTTP URLs", () => {
    expect(
      decideMarketingAutomationPublished({
        status: "ready",
        requestedPublishedUrl: " http://example.com/post ",
      }),
    ).toEqual({
      action: "transition",
      publishedUrl: "http://example.com/post",
    });
  });

  it("rejects missing or non-HTTP published URLs", () => {
    expect(
      decideMarketingAutomationPublished({
        status: "ready",
        requestedPublishedUrl: "",
      }),
    ).toEqual({ action: "reject", code: "INVALID_PUBLISHED_URL" });

    expect(
      decideMarketingAutomationPublished({
        status: "ready",
        requestedPublishedUrl: "ftp://example.com/post",
      }),
    ).toEqual({ action: "reject", code: "INVALID_PUBLISHED_URL" });
  });

  it("treats the same published URL as idempotent success", () => {
    expect(
      decideMarketingAutomationPublished({
        status: "published",
        requestedPublishedUrl: "https://example.com/post",
        currentPublishedUrl: "https://example.com/post",
      }),
    ).toEqual({
      action: "already_published",
      publishedUrl: "https://example.com/post",
    });
  });

  it("does not overwrite a different URL after publication", () => {
    expect(
      decideMarketingAutomationPublished({
        status: "published",
        requestedPublishedUrl: "https://example.com/new",
        currentPublishedUrl: "https://example.com/original",
      }),
    ).toEqual({
      action: "reject",
      code: "PUBLISHED_URL_MISMATCH",
    });
  });

  it("rejects states other than ready or already published", () => {
    expect(
      decideMarketingAutomationPublished({
        status: "approved",
        requestedPublishedUrl: "https://example.com/post",
      }),
    ).toEqual({ action: "reject", code: "INVALID_STATE" });
  });
});
