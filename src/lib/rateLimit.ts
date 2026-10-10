import { consumeDatabaseRateLimit } from "@/lib/databaseRateLimit.server";

const MINUTE_MS = 60 * 1_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

// Conservative free-launch limit, shared across all visitors/cities/identities.
// Counts provider attempts (including retries), not euros or successful answers.
export const AI_GUIDE_GLOBAL_DAILY_ATTEMPT_CAP = 120;

export const aiGuideGlobalProviderBudget = {
  limit() {
    return consumeDatabaseRateLimit({
      scope: "citywalk-ai-guide-provider-attempts-global-v1",
      identifier: "all-visitors",
      maxRequests: AI_GUIDE_GLOBAL_DAILY_ATTEMPT_CAP,
      windowMs: DAY_MS,
    });
  },
};

export const aiGuideRateLimit = {
  limit(identifier: string) {
    return consumeDatabaseRateLimit({
      scope: "citywalk-ai-guide-abuse",
      identifier,
      maxRequests: 10,
      windowMs: 10 * MINUTE_MS,
    });
  },
};

export function getAiGuideDailyRateLimit(
  tier: "free" | "premium",
  maxRequests: number,
) {
  if (!Number.isSafeInteger(maxRequests) || maxRequests <= 0) {
    throw new Error("INVALID_GUIDE_ALLOWANCE");
  }

  return {
    limit(identifier: string) {
      return consumeDatabaseRateLimit({
        scope: `citywalk-ai-${tier}-${maxRequests}-daily`,
        identifier,
        maxRequests,
        windowMs: DAY_MS,
      });
    },
  };
}
