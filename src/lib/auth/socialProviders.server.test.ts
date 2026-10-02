import { describe, expect, it } from "vitest";

import { getCitywalkSocialAuthConfiguration } from "@/lib/auth/socialProviders.server";

describe("CITYWALK social auth configuration", () => {
  it("keeps social providers disabled when no credentials are configured", () => {
    expect(getCitywalkSocialAuthConfiguration({})).toEqual({
      socialProviders: {},
      trustedOrigins: [],
    });
  });

  it("configures Google only from a complete server-side credential pair", () => {
    expect(
      getCitywalkSocialAuthConfiguration({
        CITYWALK_GOOGLE_OAUTH_CLIENT_ID: "google-client",
        CITYWALK_GOOGLE_OAUTH_CLIENT_SECRET: "google-secret",
      }),
    ).toEqual({
      socialProviders: {
        google: {
          clientId: "google-client",
          clientSecret: "google-secret",
        },
      },
      trustedOrigins: [],
    });
  });

  it("fails closed on partial Google configuration", () => {
    expect(() =>
      getCitywalkSocialAuthConfiguration({
        CITYWALK_GOOGLE_OAUTH_CLIENT_ID: "google-client",
      }),
    ).toThrow(/Google social auth is partially configured/);
  });

  it("registers Apple only from a complete credential set", () => {
    const config = getCitywalkSocialAuthConfiguration({
      CITYWALK_APPLE_OAUTH_CLIENT_ID: "com.citywalk.web",
      CITYWALK_APPLE_TEAM_ID: "TEAM123",
      CITYWALK_APPLE_KEY_ID: "KEY123",
      CITYWALK_APPLE_PRIVATE_KEY: "not-evaluated-in-this-test",
      CITYWALK_APPLE_APP_BUNDLE_IDENTIFIER: "com.citywalk.app",
    });

    expect(typeof config.socialProviders.apple).toBe("function");
    expect(config.trustedOrigins).toEqual(["https://appleid.apple.com"]);
  });

  it("fails closed on partial Apple configuration", () => {
    expect(() =>
      getCitywalkSocialAuthConfiguration({
        CITYWALK_APPLE_OAUTH_CLIENT_ID: "com.citywalk.web",
        CITYWALK_APPLE_TEAM_ID: "TEAM123",
      }),
    ).toThrow(/Apple social auth is partially configured/);
  });

  it("ignores public-prefixed values as server credentials", () => {
    expect(
      getCitywalkSocialAuthConfiguration({
        EXPO_PUBLIC_CITYWALK_GOOGLE_AUTH: "1",
        EXPO_PUBLIC_CITYWALK_APPLE_AUTH: "1",
        NEXT_PUBLIC_GOOGLE_CLIENT_SECRET: "must-not-be-used",
      }),
    ).toEqual({
      socialProviders: {},
      trustedOrigins: [],
    });
  });
});
