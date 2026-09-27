import { describe, expect, it } from "vitest";

import {
  classifyNativeAuthError,
  NATIVE_AUTH_MIN_PASSWORD_LENGTH,
  validateNativeAuthInput,
  validateDisplayName,
  validateNewPassword,
} from "../src/lib/auth/errors";

describe("native account diagnostics", () => {
  it("mirrors the server password floor before submitting", () => {
    expect(NATIVE_AUTH_MIN_PASSWORD_LENGTH).toBe(12);
    expect(validateNativeAuthInput("traveler@example.com", "short"))
      .toBe("password_too_short");
    expect(validateNativeAuthInput("traveler@example.com", "twelve-chars!"))
      .toBeUndefined();
  });

  it("validates email and classifies safe Better Auth errors", () => {
    expect(validateNativeAuthInput("invalid", "twelve-chars!")).toBe("invalid_email");
    expect(classifyNativeAuthError({ code: "USER_ALREADY_EXISTS" })).toBe("account_exists");
    expect(classifyNativeAuthError({ code: "INVALID_EMAIL_OR_PASSWORD" })).toBe("invalid_credentials");
    expect(classifyNativeAuthError(new Error("offline"))).toBe("unknown");
    expect(classifyNativeAuthError(undefined)).toBe("network");
  });
});

it("validates names and matching passwords within the server bounds", () => {
  expect(validateDisplayName("   ")).toBe("invalid_name");
  expect(validateDisplayName("x".repeat(101))).toBe("invalid_name");
  expect(validateDisplayName("اسم المسافر")).toBeUndefined();
  expect(validateNewPassword("x".repeat(8))).toBe("password_too_short");
  expect(validateNewPassword("x".repeat(12))).toBeUndefined();
  expect(validateNewPassword("x".repeat(128))).toBeUndefined();
  expect(validateNewPassword("x".repeat(129))).toBe("password_too_long");
  expect(validateNewPassword("new-password", "not-the-same")).toBe("password_mismatch");
  expect(validateNewPassword("new-password", "new-password")).toBeUndefined();
  expect(classifyNativeAuthError({ code: "PASSWORD_TOO_LONG" })).toBe("password_too_long");
});
