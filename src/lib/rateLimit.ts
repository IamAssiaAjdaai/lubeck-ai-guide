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