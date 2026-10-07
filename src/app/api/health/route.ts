import { NextResponse } from "next/server";

import { getOperationalHealth } from "@/lib/operations/health.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const health = await getOperationalHealth();
  const status = health.status === "ok" ? 200 : 503;

  return NextResponse.json(health, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      ...(status === 503 ? { "Retry-After": "30" } : {}),
    },
  });
}
