import "server-only";

import { AdminAuthorizationError } from "@/lib/admin/authorization.server";
import {
  MediaIntegrityError,
  MediaNotFoundError,
  MediaValidationError,
} from "@/lib/media/types";

export function assertTrustedMutationOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) throw new MediaValidationError("Upload request origin is invalid.");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new MediaValidationError("Upload request origin is invalid.");
  }
  if (originHost.toLowerCase() !== host.split(",", 1)[0]?.trim().toLowerCase()) {
    throw new MediaValidationError("Upload request origin is invalid.");
  }
}

export function mediaErrorResponse(error: unknown): Response {
  if (error instanceof AdminAuthorizationError) {
    return Response.json({ error: error.code }, { status: error.status });
  }
  if (error instanceof MediaNotFoundError) {
    return Response.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof MediaValidationError || error instanceof MediaIntegrityError) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  if (process.env.NODE_ENV === "development") {
    console.error("Media operation failed", error instanceof Error ? error.name : "unknown_error");
  }
  return Response.json({ error: "Media operation failed." }, { status: 502 });
}

