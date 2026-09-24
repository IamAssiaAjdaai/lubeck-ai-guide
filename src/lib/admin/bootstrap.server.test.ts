import { describe, expect, it } from "vitest";

import {
  readSuperAdminBootstrapInput,
  SuperAdminBootstrapError,
} from "@/lib/admin/bootstrap.server";

describe("super-admin bootstrap input", () => {
  it("reads credentials from server environment without CLI password arguments", () => {
    expect(
      readSuperAdminBootstrapInput({
        CITYWALK_ADMIN_EMAIL: " Admin@Example.com ",
        CITYWALK_ADMIN_NAME: " Local Admin ",
        CITYWALK_ADMIN_PASSWORD: "safe-local-password",
      }),
    ).toEqual({
      email: "admin@example.com",
      name: "Local Admin",
      password: "safe-local-password",
    });
  });

  it("fails without complete valid input", () => {
    expect(() => readSuperAdminBootstrapInput({})).toThrow(
      SuperAdminBootstrapError,
    );
    expect(() =>
      readSuperAdminBootstrapInput({
        CITYWALK_ADMIN_EMAIL: "invalid",
        CITYWALK_ADMIN_NAME: "Admin",
        CITYWALK_ADMIN_PASSWORD: "safe-local-password",
      }),
    ).toThrow(/email/);
    expect(() =>
      readSuperAdminBootstrapInput({
        CITYWALK_ADMIN_EMAIL: "admin@example.com",
        CITYWALK_ADMIN_NAME: "Admin",
        CITYWALK_ADMIN_PASSWORD: "short",
      }),
    ).toThrow(/12 to 128/);
  });
});
