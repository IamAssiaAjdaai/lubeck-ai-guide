import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export const aiGuideRateLimit = new Ratelimit({
  redis,

  limiter: Ratelimit.slidingWindow(
    10,
    "10 m"
  ),

  prefix: "lubeck-ai-guide",

  analytics: true,
});

export const aiGuideFreeDailyRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "24 h"),
  prefix: "citywalk-ai-free-daily",
  analytics: true,
});

export const aiGuidePremiumDailyRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "24 h"),
  prefix: "citywalk-ai-premium-daily",
  analytics: true,
});
