import { describe, expect, it } from "vitest";
import { getApprovedStoreLinks, validateNativeListingUrl } from "./storeLinks";

describe("LANDING-NEXT native app-store links", () => {
  const ios = "https://apps.apple.com/de/app/citywalk/id1234567890";
  const android = "https://play.google.com/store/apps/details?id=com.example.citywalk";

  it("withholds all store links without explicit owner approval", () => {
    expect(getApprovedStoreLinks({ approved: false, iosUrl: ios, androidUrl: android })).toEqual({
      ios: null,
      android: null,
    });
  });

  it("allows approved, structurally valid official store URLs", () => {
    expect(getApprovedStoreLinks({ approved: true, iosUrl: ios, androidUrl: android })).toEqual({
      ios,
      android,
    });
  });

  it("does not turn missing store listings into a generic store link", () => {
    expect(getApprovedStoreLinks({ approved: true })).toEqual({ ios: null, android: null });
    expect(validateNativeListingUrl("https://apps.apple.com", "ios")).toBeNull();
    expect(validateNativeListingUrl("https://play.google.com/store/apps", "android")).toBeNull();
  });

  it("rejects untrusted domains and insecure URLs", () => {
    expect(validateNativeListingUrl("http://apps.apple.com/app/id1234567890", "ios")).toBeNull();
    expect(validateNativeListingUrl("https://apps.apple.com.evil.example/app/id1234567890", "ios")).toBeNull();
    expect(validateNativeListingUrl("https://play.google.com.evil.example/store/apps/details?id=com.example.citywalk", "android")).toBeNull();
  });

  it("rejects malformed paths, fragments, embedded credentials and ports", () => {
    expect(validateNativeListingUrl("https://apps.apple.com/not-an-app/id1234567890", "ios")).toBeNull();
    expect(validateNativeListingUrl("https://user:pw@apps.apple.com/app/id1234567890", "ios")).toBeNull();
    expect(validateNativeListingUrl("https://apps.apple.com:444/app/id1234567890", "ios")).toBeNull();
    expect(validateNativeListingUrl("https://apps.apple.com/app/id1234567890#tracking", "ios")).toBeNull();
  });

  it("requires one valid Android package ID", () => {
    expect(validateNativeListingUrl("https://play.google.com/store/apps/details?id=com.example.app&id=com.evil.app", "android")).toBeNull();
    expect(validateNativeListingUrl("https://play.google.com/store/apps/details?id=malformed", "android")).toBeNull();
  });

  it("does not accept the opposite platform's store", () => {
    expect(validateNativeListingUrl(ios, "android")).toBeNull();
    expect(validateNativeListingUrl(android, "ios")).toBeNull();
  });

  it("does not accept surrounding whitespace", () => {
    expect(validateNativeListingUrl(" " + ios, "ios")).toBeNull();
  });
});
