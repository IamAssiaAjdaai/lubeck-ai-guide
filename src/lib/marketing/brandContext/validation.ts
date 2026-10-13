import { brandContextSchema, factConfirmationCommandSchema, rawBusinessBriefSchema } from "@marketing/core";
import { z } from "zod";

const id = z.uuid();
export const createRequest = z.strictObject({ campaignId: z.number().int().positive(), brief: rawBusinessBriefSchema });
export const readRequest = z.strictObject({ projectId: id, contextId: id });
export const associateRequest = readRequest.extend({ campaignId: z.number().int().positive() });
export const confirmRequest = readRequest.extend({ command: factConfirmationCommandSchema });
export const correctRequest = readRequest.extend({ expectedRevision: z.number().int().positive(), brief: rawBusinessBriefSchema });
export const purgeRequest = z.strictObject({ projectId: id, contextId: id, expectedRevision: z.number().int().positive(), eraseHistory: z.literal(true) });

/** Reject input mutation/normalization of stored evidence; hashes use stable JSON key order. */
export function canonicalJson(value: unknown): string {
  const sort = (v: unknown): unknown => Array.isArray(v) ? v.map(sort) : v && typeof v === "object"
    ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, sort(x)])) : v;
  return JSON.stringify(sort(value));
}
export function validateStoredContext(value: unknown) {
  const parsed = brandContextSchema.parse(value);
  if (canonicalJson(value) !== canonicalJson(parsed)) throw new Error("INVALID_STORED_CONTEXT");
  return parsed;
}
