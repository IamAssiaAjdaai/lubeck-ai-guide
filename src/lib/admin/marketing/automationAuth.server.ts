import "server-only";

import { timingSafeEqual } from "node:crypto";

const AUTOMATION_HEADER = "x-citywalk-automation-key";

export class MarketingAutomationAuthError extends Error {
  constructor(
    readonly code: "NOT_CONFIGURED" | "UNAUTHORIZED",
    readonly status: 401 | 503,
  ) {
    super(code);
    this.name = "MarketingAutomationAuthError";
  }
}

function secureEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);

  return (
    leftBytes.length === rightBytes.length &&
    timingSafeEqual(leftBytes, rightBytes)
  );
}

export function assertMarketingAutomationRequest(request: Request): void {
  const configuredSecret = process.env.CITYWALK_AUTOMATION_SECRET?.trim();

  if (!configuredSecret) {
    throw new MarketingAutomationAuthError("NOT_CONFIGURED", 503);
  }

  const providedSecret = request.headers.get(AUTOMATION_HEADER)?.trim();

  if (!providedSecret || !secureEqual(providedSecret, configuredSecret)) {
    throw new MarketingAutomationAuthError("UNAUTHORIZED", 401);
  }
}
