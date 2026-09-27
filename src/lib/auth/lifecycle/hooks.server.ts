import { APIError } from "better-auth/api";
import { limitLifecycle, LifecycleError } from "./rateLimit.server";
import { resetEmailConfiguration } from "./email.server";

export async function lifecycleBefore(ctx: { path?: string; body?: Record<string, unknown> | null; query?: Record<string, unknown> | null }) {
  const action = ctx.path === "/request-password-reset" ? "request" : ctx.path === "/reset-password" ? "reset" : undefined;
  if (!action) return;
  // No token in URL/query or caller-selected reset redirect.
  if (action === "reset" && ctx.query?.token) throw new APIError("BAD_REQUEST", { code: "INVALID_REQUEST", message: "Invalid request." });
  if (action === "request" && ctx.body?.redirectTo) throw new APIError("BAD_REQUEST", { code: "INVALID_REQUEST", message: "Invalid request." });
  const identity = action === "request" ? ctx.body?.email : ctx.body?.token;
  if (typeof identity !== "string" || !identity || identity.length > 320) throw new APIError("BAD_REQUEST", { code: "INVALID_REQUEST", message: "Invalid request." });
  try {
    if (action === "request") resetEmailConfiguration();
    await limitLifecycle(action, action === "request" ? identity.trim().toLowerCase() : identity);
  } catch (error) {
    const limited = error instanceof LifecycleError && error.code === "RATE_LIMITED";
    throw new APIError(limited ? "TOO_MANY_REQUESTS" : "SERVICE_UNAVAILABLE", { code: limited ? "RATE_LIMITED" : "UNAVAILABLE", message: "Request temporarily unavailable." });
  }
}
