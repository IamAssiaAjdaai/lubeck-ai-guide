import { NextResponse } from "next/server";

import { isLocale } from "@/lib/i18n";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const locale = typeof body === "object" && body !== null && "locale" in body
    ? (body as { locale?: unknown }).locale
    : undefined;

  if (!isLocale(locale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }

  const response = NextResponse.json({ locale });
  response.cookies.set("preferred_locale", locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
