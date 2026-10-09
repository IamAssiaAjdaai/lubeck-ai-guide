export type MarketingAutomationReadyDecision =
  | Readonly<{ action: "already_ready" }>
  | Readonly<{ action: "transition" }>
  | Readonly<{
      action: "reject";
      code:
        | "INVALID_STATE"
        | "UNSUPPORTED_PLATFORM"
        | "MEDIA_REQUIRED";
    }>;

export function decideMarketingAutomationReady(input: Readonly<{
  status: string;
  platform: string;
  validMediaCount: number;
}>): MarketingAutomationReadyDecision {
  if (input.status === "ready") {
    return { action: "already_ready" };
  }

  if (input.status !== "approved") {
    return { action: "reject", code: "INVALID_STATE" };
  }

  if (input.platform.trim().toLowerCase() !== "instagram") {
    return { action: "reject", code: "UNSUPPORTED_PLATFORM" };
  }

  if (!Number.isInteger(input.validMediaCount) || input.validMediaCount <= 0) {
    return { action: "reject", code: "MEDIA_REQUIRED" };
  }

  return { action: "transition" };
}
