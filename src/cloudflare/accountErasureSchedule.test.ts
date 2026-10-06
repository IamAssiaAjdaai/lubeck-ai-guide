import { describe, expect, it } from "vitest";

import { isAccountErasureScheduleConfigured } from "./accountErasureScheduleConfig";

const configured = {
  BETTER_AUTH_SECRET: "better-auth-secret",
  COMMERCE_REVENUECAT_SECRET_API_KEY: "revenuecat-secret",
  CITYWALK_APPLE_OAUTH_CLIENT_ID: "com.citywalk.service",
  CITYWALK_APPLE_TEAM_ID: "TEAM123",
  CITYWALK_APPLE_KEY_ID: "KEY123",
  CITYWALK_APPLE_PRIVATE_KEY: "private-key",
  CITYWALK_APPLE_APP_BUNDLE_IDENTIFIER: "com.citywalk.app",
} as const;

describe("account erasure schedule configuration", () => {
  it("is ready only when every server-side dependency is present", () => {
    expect(isAccountErasureScheduleConfigured(configured)).toBe(true);
  });

  it.each(Object.keys(configured))(
    "fails closed when %s is missing",
    (key) => {
      expect(
        isAccountErasureScheduleConfigured({
          ...configured,
          [key]: "",
        }),
      ).toBe(false);
    },
  );

  it("treats whitespace-only secrets as unconfigured", () => {
    expect(
      isAccountErasureScheduleConfigured({
        ...configured,
        COMMERCE_REVENUECAT_SECRET_API_KEY: "   ",
      }),
    ).toBe(false);
  });
});
