import {
  AUTH_MIN_PASSWORD_LENGTH as NATIVE_AUTH_MIN_PASSWORD_LENGTH,
  AUTH_MAX_PASSWORD_LENGTH as NATIVE_AUTH_MAX_PASSWORD_LENGTH,
} from "@citywalk/traveler-core";

export { NATIVE_AUTH_MIN_PASSWORD_LENGTH, NATIVE_AUTH_MAX_PASSWORD_LENGTH };

export type NativeAuthErrorCode =
  | "invalid_email"
  | "password_too_short"
  | "password_too_long"
  | "password_mismatch"
  | "invalid_name"
  | "current_password_required"
  | "account_exists"
  | "email_not_verified"
  | "invalid_credentials"
  | "network"
  | "unknown";

export function validateNativeAuthInput(email: string, password: string): NativeAuthErrorCode | undefined {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "invalid_email";
  return validateNewPassword(password);
}

export function validateDisplayName(name: string): NativeAuthErrorCode | undefined {
  return !name.trim() || name.trim().length > 100 ? "invalid_name" : undefined;
}
export function validateNewPassword(password: string, confirmation?: string): NativeAuthErrorCode | undefined {
  if (password.length < NATIVE_AUTH_MIN_PASSWORD_LENGTH) return "password_too_short";
  if (password.length > NATIVE_AUTH_MAX_PASSWORD_LENGTH) return "password_too_long";
  if (confirmation !== undefined && password !== confirmation) return "password_mismatch";
  return undefined;
}

export function classifyNativeAuthError(error: unknown): NativeAuthErrorCode {
  if (!error || typeof error !== "object") return "network";
  const candidate = error as Record<string, unknown>;
  const code = typeof candidate.code === "string" ? candidate.code.toUpperCase() : "";
  const message = typeof candidate.message === "string" ? candidate.message.toLowerCase() : "";
  if (code.includes("PASSWORD_TOO_SHORT") || message.includes("password") && message.includes("short")) {
    return "password_too_short";
  }
  if (code.includes("PASSWORD_TOO_LONG")) return "password_too_long";
  if (code.includes("USER_ALREADY_EXISTS") || message.includes("already exists")) return "account_exists";
  if (code.includes("EMAIL_NOT_VERIFIED")) return "email_not_verified";
  if (code.includes("INVALID_EMAIL_OR_PASSWORD") || code.includes("INVALID_PASSWORD")) return "invalid_credentials";
  if (code.includes("INVALID_EMAIL") || message.includes("invalid email")) return "invalid_email";
  return "unknown";
}
