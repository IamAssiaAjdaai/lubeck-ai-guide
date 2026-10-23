import { describe, expect, it } from "vitest";
import { forgotPasswordSchema, getAuthFieldErrors, signInSchema, signUpSchema } from "./validation";

describe("independent marketing SaaS auth UI contracts (client validation only)", () => {
  it("accepts valid sign-up fields and lowercases email", () => {
    const result = signUpSchema.safeParse({
      name: " Alex Morgan ",
      email: "ALEX@EXAMPLE.COM",
      password: "long-unique-password-2026",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Alex Morgan");
      expect(result.data.email).toBe("alex@example.com");
    }
  });

  it("rejects weak sign-up input with per-field feedback", () => {
    const result = signUpSchema.safeParse({ name: "X", email: "invalid", password: "short" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = getAuthFieldErrors(result.error.issues);
      expect(errors.name).toBeDefined();
      expect(errors.email).toBeDefined();
      expect(errors.password).toBeDefined();
    }
  });

  it("does not enforce sign-up password rules on existing account sign-in", () => {
    const result = signInSchema.safeParse({ email: "person@example.com", password: "existing" });
    expect(result.success).toBe(true);
  });

  it("rejects missing sign-in password", () => {
    expect(signInSchema.safeParse({ email: "person@example.com", password: "" }).success).toBe(false);
  });

  it("reset request accepts only email and rejects malformed entries", () => {
    expect(forgotPasswordSchema.safeParse({ email: "person@example.com" }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "bad" }).success).toBe(false);
    expect(forgotPasswordSchema.safeParse({ email: "person@example.com", password: "accidental" }).success).toBe(false);
  });

  it("does not leak the original password through form validation errors", () => {
    const secret = "privateVeryLongSecret!" + "x".repeat(160);
    const result = signUpSchema.safeParse({ name: "Alex Morgan", email: "person@example.com", password: secret });
    expect(result.success).toBe(false);
    if (!result.success) expect(JSON.stringify(getAuthFieldErrors(result.error.issues))).not.toContain(secret);
  });
});
