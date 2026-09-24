import { describe, expect, it } from "vitest";

import {
  classifyNativeAuthError,
  NATIVE_AUTH_MIN_PASSWORD_LENGTH,
  validateNativeAuthInput,
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
