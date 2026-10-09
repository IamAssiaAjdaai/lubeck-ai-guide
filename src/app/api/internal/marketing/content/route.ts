import { requireAutomationAuth } from "@/lib/marketing/automationAuth.server";
import { createAutomationMarketingDraft } from "@/lib/marketing/automationDraft.server";

export async function POST(request: Request) {
  if (!requireAutomationAuth(request)) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object") {
    return Response.json(
      { error: "Request body must be an object." },
      { status: 400 },
    );
  }

  const data = body as Record<string, unknown>;

  const requiredFields = [
    "citySlug",
    "contentCode",
    "platform",
    "format",
    "hook",
  ] as const;

  for (const field of requiredFields) {
    if (typeof data[field] !== "string" || !data[field].trim()) {
      return Response.json(
        { error: `${field} is required.` },
        { status: 400 },
      );
    }
  }

  try {
    const result = await createAutomationMarketingDraft({
      citySlug: data.citySlug as string,
      contentCode: data.contentCode as string,
      platform: data.platform as string,
      format: data.format as string,
      hook: data.hook as string,
      script:
        typeof data.script === "string"
          ? data.script
          : undefined,
      caption:
        typeof data.caption === "string"
          ? data.caption
          : undefined,
      cta:
        typeof data.cta === "string"
          ? data.cta
          : undefined,
    });

    return Response.json(
      {
        ok: true,
        created: result.created,
        draft: {
          id: result.item.id,
          contentCode: result.item.contentCode,
          status: result.item.status,
        },
      },
      {
        status: result.created ? 201 : 200,
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Marketing draft creation failed.";

    return Response.json(
      { error: message },
      { status: 400 },
    );
  }
}