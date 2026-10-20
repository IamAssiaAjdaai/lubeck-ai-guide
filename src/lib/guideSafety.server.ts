import "server-only";
import { consumeDatabaseRateLimit } from "./databaseRateLimit.server";

/** An approved runtime opt-in AND a bounded global allowance are required. */
export function guideCompletionBudget(environment: Readonly<Record<string, string | undefined>> = process.env): number | undefined {
  const raw = environment.CITYWALK_AI_DAILY_COMPLETION_LIMIT ?? "";
  const limit = Number(raw);
  if (environment.CITYWALK_AI_GUIDE_ENABLED !== "true" ||
      !/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(limit) || limit > 10000) return;
  return limit;
}

export async function reserveGuideCompletion(maxRequests: number): Promise<boolean> {
  return (await consumeDatabaseRateLimit({
    scope: "citywalk-ai-global-completions",
    identifier: "all-public-guide-requests",
    maxRequests,
    windowMs: 24 * 60 * 60 * 1000,
  })).success;
}

export class GuideBodyError extends Error {
  constructor(readonly status: number) { super("Invalid request."); }
}

export async function readGuideBody(request: Request): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) throw new GuideBodyError(400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16384) { await reader.cancel(); throw new GuideBodyError(413); }
    chunks.push(value);
  }
  try {
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  } catch { /* Do not log prompts or provider/request bodies. */ }
  throw new GuideBodyError(400);
}
