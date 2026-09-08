import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/server";
import {
  CommerceCheckoutError,
  startCommerceCheckout,
} from "@/lib/commerce/checkout.server";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const value = body as { priceId?: unknown; locale?: unknown };
  const priceId =
    typeof value.priceId === "number"
      ? value.priceId
      : Number.parseInt(String(value.priceId ?? ""), 10);
  const locale = String(value.locale ?? "");

  try {
    const checkout = await startCommerceCheckout({
      user: { id: session.user.id, email: session.user.email },
      priceId,
      locale,
    });
    return NextResponse.json(checkout);
  } catch (error) {
    if (error instanceof CommerceCheckoutError) {
      if (error.code === "INVALID_INPUT") {
        return NextResponse.json({ error: error.code }, { status: 400 });
      }
      if (error.code === "PRICE_NOT_AVAILABLE") {
        return NextResponse.json({ error: error.code }, { status: 404 });
      }
      return NextResponse.json({ error: error.code }, { status: 503 });
    }
    throw error;
  }
}
