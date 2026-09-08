import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/server";
import {
  CommerceCheckoutError,
  parseCommerceCheckoutInput,
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

  const input = parseCommerceCheckoutInput(body);
  if (!input) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  try {
    const checkout = await startCommerceCheckout({
      user: { id: session.user.id, email: session.user.email },
      ...input,
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
      if (
        error.code === "ALREADY_ENTITLED" ||
        error.code === "CHECKOUT_ALREADY_PENDING"
      ) {
        return NextResponse.json({ error: error.code }, { status: 409 });
      }
      return NextResponse.json({ error: error.code }, { status: 503 });
    }
    throw error;
  }
}
