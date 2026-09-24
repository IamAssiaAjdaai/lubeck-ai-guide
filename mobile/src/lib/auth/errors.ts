export const NATIVE_AUTH_MIN_PASSWORD_LENGTH = 12;

export type NativeAuthErrorCode =
  | "invalid_email"
  | "password_too_short"
  | "account_exists"
  | "invalid_credentials"
  | "network"
  | "unknown";

export function validateNativeAuthInput(email: string, password: string): NativeAuthErrorCode | undefined {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "invalid_email";
  if (password.length < NATIVE_AUTH_MIN_PASSWORD_LENGTH) return "password_too_short";
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
  if (code.includes("USER_ALREADY_EXISTS") || message.includes("already exists")) return "account_exists";
  if (code.includes("INVALID_EMAIL_OR_PASSWORD") || code.includes("INVALID_PASSWORD")) return "invalid_credentials";
  if (code.includes("INVALID_EMAIL") || message.includes("invalid email")) return "invalid_email";
  return "unknown";
}
