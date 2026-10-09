import { requireAutomationAuth } from "@/lib/marketing/automationAuth.server";

export async function POST(request: Request) {
  if (!requireAutomationAuth(request)) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  return Response.json({
    ok: true,
    message: "CITYWALK automation authenticated.",
  });
}