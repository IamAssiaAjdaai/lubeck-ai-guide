import { NextResponse } from "next/server";

import {
  RevenueCatWebhookError,
  handleRevenueCatWebhookRequest,
} from "@/lib/commerce/revenueCatWebhook.server";
import { emitOperationalFailure } from "@/lib/operations/operationalEvent";

export async function POST(request: Request) {
  const rawBody = await request.text();
  try {
    const result = await handleRevenueCatWebhookRequest({
      headers: request.headers,
      rawBody,
    });
    return NextResponse.json({ received: true, result });
  } catch (error) {
    if (error instanceof RevenueCatWebhookError) {
      const status = error.code === "NOT_CONFIGURED"
        ? 503
        : error.code === "INVALID_PAYLOAD"
          ? 400
          : 401;
      if (error.code === "NOT_CONFIGURED") {
        emitOperationalFailure({
          category: "commerce",
          code: "REVENUECAT_NOT_CONFIGURED",
          severity: "error",
          retryable: false,
          httpStatus: status,
        });
      }
      return NextResponse.json(
        { received: false, error: error.code },
        { status },
      );
    }
    emitOperationalFailure({
      category: "commerce",
      code: "REVENUECAT_WEBHOOK_PROCESSING_FAILED",
      severity: "critical",
      retryable: true,
      httpStatus: 500,
    });
    return NextResponse.json(
      { received: false, error: "WEBHOOK_PROCESSING_FAILED" },
      { status: 500 },
    );
  }
}
