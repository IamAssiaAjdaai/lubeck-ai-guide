import "server-only";
import { getAuth } from "@/lib/auth/server";
import { consumeDatabaseRateLimit } from "@/lib/databaseRateLimit.server";
import { NativeBillingError, requireSandbox } from "./config.server";
export const nativeJson = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "private, no-store" } });
export function nativeFailure(error: unknown) { return nativeJson({ code: error instanceof NativeBillingError ? error.code : "UNAVAILABLE" }, error instanceof NativeBillingError ? error.status : 503); }
export async function nativeUser(request: Request) {
  requireSandbox();
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") throw new NativeBillingError("INVALID_PURCHASE", 403);
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user.id || request.headers.get("X-Citywalk-Account") !== session.user.id) throw new NativeBillingError("ACCOUNT_CONFLICT", 401);
  return session.user.id;
}
export async function limitNativeVerification(userId: string) {
  try {
    const result = await consumeDatabaseRateLimit({
      scope: "citywalk-native-sandbox-verification",
      identifier: userId,
      maxRequests: 30,
      windowMs: 60 * 1_000,
    });
    if (!result.success) throw new NativeBillingError("RATE_LIMITED", 429);
  } catch (error) {
    if (error instanceof NativeBillingError) throw error;
    throw new NativeBillingError("UNAVAILABLE");
  }
}
export async function nativeBody(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new NativeBillingError("INVALID_PURCHASE", 415);
  const reader = request.body?.getReader(); if (!reader) throw new NativeBillingError("INVALID_PURCHASE", 400);
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 32768) { await reader.cancel(); throw new NativeBillingError("INVALID_PURCHASE", 413); } chunks.push(value); }
  try { const value = JSON.parse(Buffer.concat(chunks).toString("utf8")); if (value && typeof value === "object" && !Array.isArray(value)) return value; } catch { /* Never expose payload/errors. */ }
  throw new NativeBillingError("INVALID_PURCHASE", 400);
}
