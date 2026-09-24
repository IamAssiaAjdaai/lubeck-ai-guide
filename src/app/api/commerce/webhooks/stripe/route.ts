import { NextResponse } from "next/server";

import { createStripeProvider } from "@/lib/commerce/stripeProvider.server";
import { processVerifiedProviderEvent } from "@/lib/commerce/webhook.server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "MISSING_SIGNATURE" }, { status: 400 });
  }

  const rawBody = await request.text();
  let verified;
  try {
    verified = createStripeProvider().verifyWebhook(rawBody, signature);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = /STRIPE_(SECRET_KEY|WEBHOOK_SECRET)/.test(message) ? 503 : 400;
    return NextResponse.json(
      { error: status === 503 ? "PAYMENT_PROVIDER_NOT_CONFIGURED" : "INVALID_SIGNATURE" },
      { status },
    );
  }

  const result = await processVerifiedProviderEvent(verified);
  return NextResponse.json({ result });
}
