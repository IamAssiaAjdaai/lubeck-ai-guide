import type { GuideAllowance } from "./api/contracts";
import { CitywalkApiError } from "./api/client";

export type GuideFailure = "daily_allowance" | "abuse_limit" | "technical";

export function classifyGuideFailure(error: unknown): GuideFailure {
  if (error instanceof CitywalkApiError) {
    if (error.code === "guide_daily_allowance_reached" && error.allowance?.remaining === 0) {
      return "daily_allowance";
    }
    if (error.code === "guide_abuse_rate_limited") return "abuse_limit";
  }
  return "technical";
}

export function isGuideAllowanceExhausted(allowance: GuideAllowance | undefined): boolean {
  return allowance?.remaining === 0;
}
