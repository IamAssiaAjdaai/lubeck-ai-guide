import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export const aiGuideRateLimit = new Ratelimit({
  redis,

  limiter: Ratelimit.slidingWindow(
    10,
    "10 m"
  ),

  prefix: "citywalk-ai-guide",

  analytics: true,
});

const dailyGuideLimiters = new Map<string, Ratelimit>();

export function getAiGuideDailyRateLimit(
  tier: "free" | "premium",
  maxRequests: number,
): Ratelimit {
  if (!Number.isSafeInteger(maxRequests) || maxRequests <= 0) {
    throw new Error("INVALID_GUIDE_ALLOWANCE");
  }
  const key = `${tier}:${maxRequests}`;
  const existing = dailyGuideLimiters.get(key);
  if (existing) return existing;
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(maxRequests, "24 h"),
    prefix: `citywalk-ai-${tier}-${maxRequests}-daily`,
    analytics: true,
  });
  dailyGuideLimiters.set(key, limiter);
  return limiter;
}
