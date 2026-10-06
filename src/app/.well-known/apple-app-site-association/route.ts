import { NextResponse } from "next/server";

import { buildAppleAppSiteAssociation } from "@/lib/nativeAppAssociation.server";

export async function GET() {
  const payload = buildAppleAppSiteAssociation();
  if (!payload) {
    return NextResponse.json(
      { error: "CITYWALK Apple app-link association is not configured." },
      { status: 503 },
    );
  }

  return NextResponse.json(payload, {
    headers: {
      "cache-control": "public, max-age=3600",
    },
  });
}
