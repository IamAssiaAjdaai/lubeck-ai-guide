import { getAuth } from "@/lib/auth/server";
import { AccountDataExportError, buildAccountDataExport } from "@/lib/account/dataExport.server";
import { externalRequestOrigin } from "@/lib/auth/lifecycle/requestOrigin";

const jsonError = (error: string, status: number) =>
  Response.json({ error }, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });

export async function GET(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if ((origin && origin !== externalRequestOrigin(request)) ||
        request.headers.get("sec-fetch-site") === "cross-site") {
      return jsonError("Request not allowed.", 403);
    }

    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session || request.headers.get("X-Citywalk-Account") !== session.user.id) {
      return jsonError("Authentication required.", 401);
    }

    const payload = await buildAccountDataExport(session.user.id);
    const date = payload.generatedAt.slice(0, 10);
    return new Response(JSON.stringify(payload, null, 2) + "\n", {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="citywalk-data-export-${date}.json"`,
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return jsonError(
      "Data export is temporarily unavailable.",
      error instanceof AccountDataExportError ? error.status : 503,
    );
  }
}
