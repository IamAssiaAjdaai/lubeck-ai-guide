import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/lib/auth/server";
import { reportAuthFailure } from "@/lib/auth/authFailureTelemetry";
import { emitOperationalFailure } from "@/lib/operations/operationalEvent";

type AuthMethod = "GET" | "POST";

async function handleAuthRequest(
  method: AuthMethod,
  request: Request,
): Promise<Response> {
  try {
    const handler = toNextJsHandler(getAuth())[method];
    const response = await handler(request);
    reportAuthFailure(request, response.status);
    return response;
  } catch (error) {
    emitOperationalFailure({
      category: "auth",
      code: "AUTH_SERVER_FAILED",
      severity: "error",
      retryable: true,
      httpStatus: 500,
    });
    throw error;
  }
}

export const GET = (request: Request) => handleAuthRequest("GET", request);
export const POST = (request: Request) => handleAuthRequest("POST", request);
