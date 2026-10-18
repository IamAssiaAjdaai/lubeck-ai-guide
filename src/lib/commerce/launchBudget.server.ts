import "server-only";
import { consumeDatabaseRateLimit } from "@/lib/databaseRateLimit.server";

/** Reserve every SDK attempt, including attribution retries. No refund on failure. */
export async function reserveLaunchAiCall() {
  if (process.env.CITYWALK_LAUNCH_FREE_ENABLED !== "1") return;
  const cap = Number(process.env.CITYWALK_LAUNCH_AI_CALLS_PER_24H);
  if (!Number.isSafeInteger(cap) || cap <= 0 || cap > 1000) throw new Error("LAUNCH_AI_BUDGET_UNAVAILABLE");
  const result = await consumeDatabaseRateLimit({
    scope: "citywalk-launch-provider-calls-v1",
    identifier: "global",
    maxRequests: cap,
    windowMs: 24 * 60 * 60 * 1000,
  });
  if (!result.success) throw new Error("LAUNCH_AI_BUDGET_EXHAUSTED");
}
