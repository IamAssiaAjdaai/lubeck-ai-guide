import { NextResponse } from "next/server";

import { buildAndroidAssetLinks } from "@/lib/nativeAppAssociation.server";

export async function GET() {
  const payload = buildAndroidAssetLinks();
  if (!payload) {
    return NextResponse.json(
      { error: "CITYWALK Android app-link association is not configured." },
      { status: 503 },
    );
  }

  return NextResponse.json(payload, {
    headers: {
      "cache-control": "public, max-age=3600",
    },
  });
}
