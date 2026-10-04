import "server-only";

import { consumeDatabaseRateLimit } from "@/lib/databaseRateLimit.server";

export class LifecycleError extends Error {
  constructor(
    readonly code:
      | "UNAVAILABLE"
      | "RATE_LIMITED"
      | "REAUTH_REQUIRED"
      | "RETENTION_REVIEW_REQUIRED"
      | "INVALID_REQUEST",
    readonly status = 503,
  ) {
    super(code);
  }
}

const FIFTEEN_MINUTES_MS = 15 * 60 * 1_000;

// Shared PostgreSQL limiter. The database layer HMACs identifiers with
// BETTER_AUTH_SECRET before persistence, so email addresses, user IDs and
// reset tokens are never stored in the rate-limit table.
export async function limitLifecycle(
  action: "request" | "reset" | "validate" | "delete",
  identity: string,
) {
  if (!process.env.BETTER_AUTH_SECRET?.trim()) {
    throw new LifecycleError("UNAVAILABLE");
  }

  try {
    const global = await consumeDatabaseRateLimit({
      scope: `citywalk-account-${action}-global`,
      identifier: "all",
      maxRequests: 60,
      windowMs: FIFTEEN_MINUTES_MS,
    });
    if (!global.success) throw new LifecycleError("RATE_LIMITED", 429);

    const personal = await consumeDatabaseRateLimit({
      scope: `citywalk-account-${action}`,
      identifier: identity,
      maxRequests: action === "request" ? 3 : 10,
      windowMs: FIFTEEN_MINUTES_MS,
    });
    if (!personal.success) throw new LifecycleError("RATE_LIMITED", 429);
  } catch (error) {
    if (error instanceof LifecycleError) throw error;
    throw new LifecycleError("UNAVAILABLE");
  }
}
