import "server-only";
import { createHmac } from "node:crypto";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

export class LifecycleError extends Error {
  constructor(readonly code: "UNAVAILABLE" | "RATE_LIMITED" | "REAUTH_REQUIRED" | "RETENTION_REVIEW_REQUIRED" | "INVALID_REQUEST", readonly status = 503) {
    super(code);
  }
}
// Shared remote limiter; never silently fall back to per-process memory on Vercel.
// Keys contain only a keyed digest, not email addresses, user IDs or reset tokens.
export async function limitLifecycle(action: "request" | "reset" | "validate" | "delete", identity: string) {
  const { UPSTASH_REDIS_REST_URL: url, UPSTASH_REDIS_REST_TOKEN: token, BETTER_AUTH_SECRET: secret } = process.env;
  if (!url || !token || !secret) throw new LifecycleError("UNAVAILABLE");
  try {
    const redis = new Redis({ url, token });
    const prefix = `citywalk-account-${action}`;
    const global = new Ratelimit({ redis, prefix: `${prefix}-global`, limiter: Ratelimit.slidingWindow(60, "15 m"), analytics: false });
    const personal = new Ratelimit({ redis, prefix, limiter: Ratelimit.slidingWindow(action === "request" ? 3 : 10, "15 m"), analytics: false });
    const key = createHmac("sha256", secret).update(identity).digest("hex");
    for (const [limiter, identifier] of [[global, "all"], [personal, key]] as const) {
      const result = await limiter.limit(identifier);
      // Upstash's default timeout result is success:true. Account mutations and
      // email requests must explicitly reject this fail-open SDK response.
      if (result.reason === "timeout") throw new LifecycleError("UNAVAILABLE");
      if (!result.success) throw new LifecycleError("RATE_LIMITED", 429);
    }
  } catch (error) {
    if (error instanceof LifecycleError) throw error;
    throw new LifecycleError("UNAVAILABLE");
  }
}
