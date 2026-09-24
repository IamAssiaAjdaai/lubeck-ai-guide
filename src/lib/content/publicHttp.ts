import { createHash } from "node:crypto";

export const PUBLIC_CONTENT_CACHE_CONTROL =
  "public, max-age=0, s-maxage=60, stale-while-revalidate=300";

export function publicContentJsonResponse(
  request: Request,
  value: unknown,
  contentDurationMs: number,
): Response {
  const body = JSON.stringify(value);
  const version = createHash("sha256").update(body).digest("base64url");
  const etag = `"${version}"`;
  const headers = new Headers({
    "Cache-Control": PUBLIC_CONTENT_CACHE_CONTROL,
    "Content-Length": String(Buffer.byteLength(body)),
    "Content-Type": "application/json; charset=utf-8",
    ETag: etag,
    "Server-Timing": `citywalk-content;dur=${contentDurationMs.toFixed(1)}`,
    "X-Citywalk-Content-Version": version.slice(0, 16),
  });
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(body, { status: 200, headers });
}

export function publicContentErrorResponse(
  message: string,
  status: number,
): Response {
  return Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}
