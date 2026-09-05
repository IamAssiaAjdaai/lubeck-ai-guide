import { describe, expect, it } from "vitest";

import { getBetterAuthEnvironment } from "@/lib/auth/env";

describe("Better Auth environment", () => {
  it("accepts server-only auth configuration", () => {
    expect(
      getBetterAuthEnvironment({
        BETTER_AUTH_SECRET: "a-secure-test-secret-with-32-characters",
        BETTER_AUTH_URL: "https://admin.example.com/path",
      }),
    ).toEqual({
      secret: "a-secure-test-secret-with-32-characters",
      baseURL: "https://admin.example.com",
    });
  });

  it("fails closed when the secret is absent or too short", () => {
    expect(() =>
      getBetterAuthEnvironment({
        BETTER_AUTH_URL: "http://localhost:3000",
      }),
    ).toThrow(/BETTER_AUTH_SECRET/);
    expect(() =>
      getBetterAuthEnvironment({
        BETTER_AUTH_SECRET: "short",
        BETTER_AUTH_URL: "http://localhost:3000",
      }),
    ).toThrow(/at least 32 characters/);
  });

  it("rejects missing, relative, and non-http base URLs", () => {
    const secret = "a-secure-test-secret-with-32-characters";

    expect(() =>
      getBetterAuthEnvironment({ BETTER_AUTH_SECRET: secret }),
    ).toThrow(/BETTER_AUTH_URL/);
    expect(() =>
      getBetterAuthEnvironment({
        BETTER_AUTH_SECRET: secret,
        BETTER_AUTH_URL: "/admin",
      }),
    ).toThrow(/absolute URL/);
    expect(() =>
      getBetterAuthEnvironment({
        BETTER_AUTH_SECRET: secret,
        BETTER_AUTH_URL: "ftp://example.com",
      }),
    ).toThrow(/http or https/);
  });
});
