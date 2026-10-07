// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getOperationalHealth,
  getReleaseIdentifier,
  getRuntimeEnvironment,
} from "./health.server";

const productionEnvironment = {
  CITYWALK_RUNTIME_ENV: "production",
  CITYWALK_RELEASE: "abc123def456",
  BETTER_AUTH_SECRET: "auth-secret-value",
  BETTER_AUTH_URL: "https://getcitywalk.com",
  CITYWALK_MEDIA_STORAGE: "s3",
  CITYWALK_MEDIA_S3_ENDPOINT: "https://media.example.test",
  CITYWALK_MEDIA_S3_REGION: "auto",
  CITYWALK_MEDIA_S3_BUCKET: "citywalk-production",
  CITYWALK_MEDIA_S3_ACCESS_KEY_ID: "access-key-value",
  CITYWALK_MEDIA_S3_SECRET_ACCESS_KEY: "secret-key-value",
  RESEND_API_KEY: "resend-secret-value",
  CITYWALK_EMAIL_FROM: "CITYWALK <hello@getcitywalk.com>",
  GROQ_API_KEY: "groq-secret-value",
} as const;

describe("operational health", () => {
  it("reports production ready when the database and required configuration are healthy", async () => {
    const health = await getOperationalHealth({
      environment: productionEnvironment,
      databaseProbe: async () => undefined,
      now: new Date("2026-10-07T14:00:00.000Z"),
    });

    expect(health).toEqual({
      service: "citywalk",
      status: "ok",
      environment: "production",
      release: "abc123def456",
      checkedAt: "2026-10-07T14:00:00.000Z",
      checks: {
        database: "ok",
        authConfiguration: "ok",
        mediaConfiguration: "ok",
        emailConfiguration: "ok",
        aiConfiguration: "ok",
      },
    });
    expect(JSON.stringify(health)).not.toMatch(
      /auth-secret-value|access-key-value|secret-key-value|resend-secret-value|groq-secret-value/,
    );
  });

  it("fails readiness without exposing which secret value is missing", async () => {
    const health = await getOperationalHealth({
      environment: {
        ...productionEnvironment,
        GROQ_API_KEY: "",
        CITYWALK_MEDIA_S3_SECRET_ACCESS_KEY: "",
      },
      databaseProbe: async () => undefined,
    });

    expect(health.status).toBe("degraded");
    expect(health.checks).toMatchObject({
      database: "ok",
      mediaConfiguration: "missing",
      aiConfiguration: "missing",
    });
  });

  it("fails readiness when PostgreSQL is unreachable", async () => {
    const health = await getOperationalHealth({
      environment: productionEnvironment,
      databaseProbe: async () => {
        throw new Error("postgres host and credentials must stay private");
      },
    });

    expect(health.status).toBe("degraded");
    expect(health.checks.database).toBe("error");
    expect(JSON.stringify(health)).not.toContain("postgres host");
  });

  it("does not require production-only service configuration in development", async () => {
    const health = await getOperationalHealth({
      environment: { CITYWALK_RUNTIME_ENV: "development" },
      databaseProbe: async () => undefined,
    });

    expect(health.status).toBe("ok");
    expect(health.checks).toEqual({
      database: "ok",
      authConfiguration: "not_required",
      mediaConfiguration: "not_required",
      emailConfiguration: "not_required",
      aiConfiguration: "not_required",
    });
  });

  it("derives safe environment and release metadata", () => {
    expect(getRuntimeEnvironment({ VERCEL_ENV: "preview" })).toBe("preview");
    expect(getRuntimeEnvironment({ NODE_ENV: "test" })).toBe("test");
    expect(getReleaseIdentifier({ VERCEL_GIT_COMMIT_SHA: "abcdef123456" }))
      .toBe("abcdef123456");
    expect(getReleaseIdentifier({ CITYWALK_RELEASE: "unsafe value with spaces" }))
      .toBe("unknown");
  });
});
