import { NextResponse } from "next/server";

import {
  RevenueCatWebhookError,
  handleRevenueCatWebhookRequest,
} from "@/lib/commerce/revenueCatWebhook.server";

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
      return NextResponse.json(
        { received: false, error: error.code },
        { status },
      );
    }
    console.error("RevenueCat webhook processing failed", error);
    return NextResponse.json(
      { received: false, error: "WEBHOOK_PROCESSING_FAILED" },
      { status: 500 },
    );
  }
}
