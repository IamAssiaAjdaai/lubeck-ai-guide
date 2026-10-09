import {
  assertMarketingAutomationRequest,
  MarketingAutomationAuthError,
} from "@/lib/admin/marketing/automationAuth.server";
import {
  markMarketingContentPublishedByAutomation,
  MarketingAutomationWorkflowError,
} from "@/lib/admin/marketing/automationWorkflow.server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: Readonly<{ params: Promise<{ id: string }> }>,
): Promise<Response> {
  try {
    assertMarketingAutomationRequest(request);

    const { id } = await params;
    const contentId = Number(id);

    if (!Number.isInteger(contentId) || contentId <= 0) {
      return Response.json(
        { ok: false, error: "INVALID_CONTENT_ID" },
        {
          status: 400,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    const body = (await request.json().catch(() => undefined)) as
      | { publishedUrl?: unknown }
      | undefined;

    const result = await markMarketingContentPublishedByAutomation(
      contentId,
      body?.publishedUrl,
    );

    return Response.json(
      { ok: true, result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof MarketingAutomationAuthError) {
      return Response.json(
        { ok: false, error: error.code },
        {
          status: error.status,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    if (error instanceof MarketingAutomationWorkflowError) {
      return Response.json(
        { ok: false, error: error.code },
        {
          status: error.status,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    if (process.env.NODE_ENV === "development") {
      console.error(
        "Marketing automation published transition failed",
        error instanceof Error ? error.name : "unknown_error",
      );
    }

    return Response.json(
      { ok: false, error: "AUTOMATION_WORKFLOW_FAILED" },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
