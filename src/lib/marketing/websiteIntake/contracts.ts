import { z } from "zod";

const url = z.url({ protocol: /^https$/ }).max(2048);
const bounded = (max: number) => z.string().trim().min(1).max(max);
export const websiteFactSchema = z.strictObject({
  id: bounded(128).regex(/^[a-zA-Z0-9._:-]+$/),
  statement: bounded(500), sourceUrl: url, evidence: bounded(500),
});
export const websiteIntakeSchema = z.strictObject({
  websiteUrl: url, title: bounded(160).optional(), fetchedAt: z.iso.datetime({ offset: true }),
  facts: z.array(websiteFactSchema).max(24),
}).superRefine((value, ctx) => {
  if (new Set(value.facts.map(f => f.id)).size !== value.facts.length)
    ctx.addIssue({ code: "custom", message: "Duplicate fact identifiers" });
});
export const intakeRequestSchema = z.strictObject({
  websiteUrl: url, businessName: bounded(160), selectedPages: z.array(url).max(2).default([]),
});
export const extractedPageSchema = z.strictObject({
  sourceUrl: url, fetchedAt: z.iso.datetime({ offset: true }),
  title: z.string().max(160), description: z.string().max(500),
  candidates: z.array(bounded(500)).max(8), uncertainty: z.literal("requires_human_review"),
});
export type ExtractedPage = z.infer<typeof extractedPageSchema>;
