import { describe, expect, it } from "vitest";

import { getBetterAuthEnvironment } from "@/lib/auth/env";

describe("Better Auth environment", () => {
  it("prefers an explicit Better Auth URL", () => {
    expect(
      getBetterAuthEnvironment({
        BETTER_AUTH_SECRET: "a-secure-test-secret-with-32-characters",
        BETTER_AUTH_URL: "https://admin.example.com/path",
        VERCEL_URL: "preview.example.vercel.app",
        VERCEL_BRANCH_URL: "branch.example.vercel.app",
      }),
    ).toEqual({
      secret: "a-secure-test-secret-with-32-characters",
      baseURL: "https://admin.example.com",
    });
  });

  it("creates a dynamic base URL from the Vercel deployment hostname", () => {
    expect(
      getBetterAuthEnvironment({
        BETTER_AUTH_SECRET: "a-secure-test-secret-with-32-characters",
        VERCEL_URL:
          "lubeck-ai-guide-git-feat-admin-console-rbac-example.vercel.app",
      }),
    ).toEqual({
      secret: "a-secure-test-secret-with-32-characters",
      baseURL: {
        allowedHosts: [
          "lubeck-ai-guide-git-feat-admin-console-rbac-example.vercel.app",
        ],
        protocol: "https",
        fallback:
          "https://lubeck-ai-guide-git-feat-admin-console-rbac-example.vercel.app",
      },
    });
  });

  it("allows both the Vercel deployment and branch alias hostnames", () => {
    expect(
      getBetterAuthEnvironment({
        BETTER_AUTH_SECRET: "a-secure-test-secret-with-32-characters",
        VERCEL_URL: "deployment.example.vercel.app",
        VERCEL_BRANCH_URL: "branch.example.vercel.app",
      }).baseURL,
    ).toEqual({
      allowedHosts: [
        "deployment.example.vercel.app",
        "branch.example.vercel.app",
      ],
      protocol: "https",
      fallback: "https://deployment.example.vercel.app",
    });
  });

  it("deduplicates matching Vercel deployment and branch hostnames", () => {
    expect(
      getBetterAuthEnvironment({
        BETTER_AUTH_SECRET: "a-secure-test-secret-with-32-characters",
        VERCEL_URL: "same.example.vercel.app",
        VERCEL_BRANCH_URL: "same.example.vercel.app",
      }).baseURL,
    ).toEqual({
      allowedHosts: ["same.example.vercel.app"],
      protocol: "https",
      fallback: "https://same.example.vercel.app",
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

  it("does not fall back when an explicit URL is malformed", () => {
    expect(() =>
      getBetterAuthEnvironment({
        BETTER_AUTH_SECRET: "a-secure-test-secret-with-32-characters",
        BETTER_AUTH_URL: "/admin",
        VERCEL_URL: "preview.example.vercel.app",
      }),
    ).toThrow(/absolute URL/);
  });

  it("rejects malformed Vercel hostnames", () => {
    expect(() =>
      getBetterAuthEnvironment({
        BETTER_AUTH_SECRET: "a-secure-test-secret-with-32-characters",
        VERCEL_URL: "https://preview.example.vercel.app/admin",
      }),
    ).toThrow(/VERCEL_URL/);
  });

  it("fails closed when the Vercel branch hostname is malformed", () => {
    expect(() =>
      getBetterAuthEnvironment({
        BETTER_AUTH_SECRET: "a-secure-test-secret-with-32-characters",
        VERCEL_URL: "deployment.example.vercel.app",
        VERCEL_BRANCH_URL: "https://branch.example.vercel.app/admin",
      }),
    ).toThrow(/VERCEL_BRANCH_URL/);
  });

  it("requires the Vercel deployment hostname as the fallback anchor", () => {
    expect(() =>
      getBetterAuthEnvironment({
        BETTER_AUTH_SECRET: "a-secure-test-secret-with-32-characters",
        VERCEL_BRANCH_URL: "branch.example.vercel.app",
      }),
    ).toThrow(/VERCEL_URL/);
  });

  it("ignores public-prefixed auth configuration", () => {
    expect(() =>
      getBetterAuthEnvironment({
        NEXT_PUBLIC_BETTER_AUTH_SECRET:
          "a-public-value-that-must-never-configure-server-auth",
        NEXT_PUBLIC_BETTER_AUTH_URL: "https://public.example.com",
        NEXT_PUBLIC_VERCEL_URL: "public-deployment.example.vercel.app",
        NEXT_PUBLIC_VERCEL_BRANCH_URL: "public-branch.example.vercel.app",
      }),
    ).toThrow(/BETTER_AUTH_SECRET/);
  });
});
