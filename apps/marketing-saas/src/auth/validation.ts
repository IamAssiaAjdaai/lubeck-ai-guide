import { z } from "zod";

// Client-side UX validation only; the eventual auth server MUST independently
// validate all input and enforce rate limits, email verification and sessions.
const email = z.email("Enter a valid email address.").trim().max(254, "Email address is too long.")
  .transform((value) => value.toLowerCase());

const password = z.string().min(12, "Use at least 12 characters.")
  .max(128, "Password is too long.");

export const signUpSchema = z.strictObject({
  name: z.string().trim().min(2, "Enter your full name.").max(100, "Name is too long."),
  email,
  password,
});
export const signInSchema = z.strictObject({
  email,
  password: z.string().min(1, "Enter your password."),
});
export const forgotPasswordSchema = z.strictObject({ email });

export type SignUpInput = z.input<typeof signUpSchema>;
export type SignInInput = z.input<typeof signInSchema>;
export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>;
export type AuthField = "name" | "email" | "password";

export function getAuthFieldErrors(
  issues: readonly z.core.$ZodIssue[],
): Partial<Record<AuthField, string>> {
  const errors: Partial<Record<AuthField, string>> = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if ((field === "name" || field === "email" || field === "password") && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return errors;
}
