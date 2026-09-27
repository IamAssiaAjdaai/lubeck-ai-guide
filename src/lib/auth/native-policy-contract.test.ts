import { describe, expect, it, vi } from "vitest";
import { AUTH_MIN_PASSWORD_LENGTH, AUTH_MAX_PASSWORD_LENGTH } from "@citywalk/traveler-core";
const mocks = vi.hoisted(() => ({ configure: vi.fn() }));
vi.mock("better-auth", () => ({ betterAuth: mocks.configure }));
vi.mock("@better-auth/drizzle-adapter", () => ({ drizzleAdapter: () => ({}) }));
vi.mock("@better-auth/expo", () => ({ expo: () => ({}) }));
vi.mock("@/db/client", () => ({ getDb: () => ({}) }));
vi.mock("@/lib/auth/env", () => ({ getBetterAuthEnvironment: () => ({ baseURL: "https://auth.example.test", secret: "test-only-not-a-real-secret" }) }));
import { createCitywalkAuth } from "./factory.server";

describe("native account capability contract", () => {
  it("keeps native password bounds identical to the actual traveler and staff factory", () => {
    for (const allowEmailSignUp of [true, false]) {
      createCitywalkAuth({ allowEmailSignUp });
      const config = mocks.configure.mock.lastCall![0];
      expect(config.emailAndPassword).toMatchObject({
        enabled: true, autoSignIn: false, disableSignUp: !allowEmailSignUp,
        minPasswordLength: AUTH_MIN_PASSWORD_LENGTH,
        maxPasswordLength: AUTH_MAX_PASSWORD_LENGTH,
      });
    }
  });
  it("truthfully treats reset mail, deletion, email change and social sign-in as unconfigured", () => {
    createCitywalkAuth({ allowEmailSignUp: true });
    const config = mocks.configure.mock.lastCall![0];
    expect(config.emailAndPassword.sendResetPassword).toBeUndefined();
    expect(config.user?.deleteUser?.enabled).not.toBe(true);
    expect(config.user?.changeEmail?.enabled).not.toBe(true);
    expect(config.socialProviders).toBeUndefined();
  });
});
