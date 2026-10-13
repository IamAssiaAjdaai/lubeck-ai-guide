import { z } from "zod";

import { redactObviousCredentials } from "./privacy";

const identifier = z.string().trim().regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/)
  .refine((value) => redactObviousCredentials(value) === value, "Credential-like identifier is not allowed");
const text = (max: number) => z.string().trim().min(1).max(max)
  .transform(redactObviousCredentials);
const timestamp = z.iso.datetime({ offset: true });
const language = z.string().trim().min(2).max(35)
  .regex(/^[a-zA-Z]{2,8}(?:-[a-zA-Z0-9]{1,8})*$/);
const locator = z.url({ protocol: /^https?$/ }).max(2048)
  .refine((value) => !/^https?:\/\/[^/?#]*@/i.test(value), "URL credentials are not allowed")
  .refine((value) => redactObviousCredentials(value) === value, "Credential-like URL is not allowed");

export const provenanceSchema = z.strictObject({
  id: identifier,
  kind: z.enum(["raw_brief", "manual", "website", "document", "repository"]),
  label: text(200),
  locator: locator.optional(),
  observedAt: timestamp.optional(),
});

const identity = z.strictObject({
  name: text(160),
  summary: text(2000).optional(),
  businessType: text(120).optional(),
  website: locator.optional(),
});
const offering = z.strictObject({
  id: identifier,
  name: text(160),
  description: text(2000),
});
const audience = z.strictObject({
  id: identifier,
  description: text(1000),
});
const goal = z.strictObject({
  id: identifier,
  description: text(1000),
  cta: text(200).optional(),
});
const tone = z.strictObject({
  voice: z.array(text(120)).max(20).default([]),
  avoid: z.array(text(200)).max(20).default([]),
  forbiddenClaims: z.array(text(500)).max(50).default([]),
});
const market = z.strictObject({
  id: identifier,
  name: text(160),
  countryCode: z.string().regex(/^[A-Z]{2}$/).optional(),
});
const factProposal = z.strictObject({
  id: identifier,
  statement: text(2000),
  basis: z.enum(["user_supplied", "source_backed"]).default("user_supplied"),
  provenanceIds: z.array(identifier).max(10).default([]),
});
const hypothesis = z.strictObject({
  id: identifier,
  statement: text(2000),
  rationale: text(2000).optional(),
  provenanceIds: z.array(identifier).max(10).default([]),
});
const missingInformation = z.strictObject({
  id: identifier,
  field: z.enum(["identity", "offerings", "target_audiences", "marketing_goals", "tone", "markets", "languages", "facts", "other"]),
  question: text(500),
});

const briefShape = {
  rawText: text(20_000),
  identity,
  offerings: z.array(offering).max(50).default([]),
  targetAudiences: z.array(audience).max(50).default([]),
  marketingGoals: z.array(goal).max(20).default([]),
  tone: tone.default({ voice: [], avoid: [], forbiddenClaims: [] }),
  markets: z.array(market).max(50).default([]),
  languages: z.array(language).max(20).default([]),
  provenance: z.array(provenanceSchema).max(99).default([]),
  facts: z.array(factProposal).max(100).default([]),
  hypotheses: z.array(hypothesis).max(100).default([]),
  missingInformation: z.array(missingInformation).max(40).default([]),
};

function checkUnique(
  values: readonly string[],
  path: string[],
  ctx: z.RefinementCtx,
) {
  if (new Set(values).size !== values.length) {
    ctx.addIssue({ code: "custom", path, message: "Duplicate identifiers are not allowed" });
  }
}

function validateBriefRelations(
  value: {
    provenance: { id: string; kind: string }[];
    facts: { id: string; basis: string; provenanceIds: string[] }[];
    hypotheses: { id: string; provenanceIds: string[] }[];
    offerings: { id: string }[];
    targetAudiences: { id: string }[];
    marketingGoals: { id: string }[];
    markets: { id: string }[];
    languages: string[];
    missingInformation: { id: string }[];
  },
  ctx: z.RefinementCtx,
) {
  for (const key of ["provenance", "offerings", "targetAudiences", "marketingGoals", "markets", "missingInformation"] as const) {
    checkUnique(value[key].map((item) => item.id), [key], ctx);
  }
  checkUnique([...value.facts, ...value.hypotheses].map((item) => item.id), ["facts"], ctx);
  checkUnique(value.languages.map((item) => item.toLowerCase()), ["languages"], ctx);
  const sources = new Map(value.provenance.map((source) => [source.id, source]));
  for (const key of ["facts", "hypotheses"] as const) {
    for (const item of value[key]) {
      checkUnique(item.provenanceIds, [key], ctx);
      if (item.provenanceIds.some((id) => !sources.has(id))) {
        ctx.addIssue({ code: "custom", path: [key], message: "Unknown provenance reference" });
      }
    }
  }
  for (const fact of value.facts) {
    if (fact.basis === "source_backed" && !fact.provenanceIds.some((id) => {
      const kind = sources.get(id)?.kind;
      return kind === "website" || kind === "document" || kind === "repository";
    })) {
      ctx.addIssue({ code: "custom", path: ["facts"], message: "Source-backed proposals require external provenance" });
    }
  }
}

/** Untrusted input cannot contain approval, reviewer identity or confirmation. */
export const rawBusinessBriefSchema = z.strictObject(briefShape)
  .superRefine(validateBriefRelations);

const confirmationSchema = z.strictObject({
  actorId: identifier,
  confirmedAt: timestamp,
  statement: text(2000),
  basis: z.enum(["user_supplied", "source_backed"]),
  provenance: z.array(provenanceSchema).min(1).max(10),
});
const contextFact = factProposal.extend({
  confirmation: confirmationSchema.nullable(),
});

/** Structural validation of trusted stored context; not proof of authorization. */
export const brandContextSchema = z.strictObject({
  schemaVersion: z.literal(1),
  contextId: identifier,
  projectId: identifier,
  revision: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  createdAt: timestamp,
  updatedAt: timestamp,
  briefSourceId: identifier,
  ...briefShape,
  facts: z.array(contextFact).max(100),
  provenance: z.array(provenanceSchema).max(100),
  missingInformation: z.array(missingInformation).max(50),
}).superRefine((value, ctx) => {
  validateBriefRelations(value, ctx);
  if (Date.parse(value.updatedAt) < Date.parse(value.createdAt)) {
    ctx.addIssue({ code: "custom", path: ["updatedAt"], message: "Context timestamps are out of order" });
  }
  if (!value.provenance.some((source) => source.id === value.briefSourceId && source.kind === "raw_brief")) {
    ctx.addIssue({ code: "custom", path: ["briefSourceId"], message: "Raw brief provenance is required" });
  }
  for (const fact of value.facts) {
    if (fact.provenanceIds.length === 0) {
      ctx.addIssue({ code: "custom", path: ["facts"], message: "Context facts require provenance" });
    }
    const approval = fact.confirmation;
    if (!approval) continue;
    const sources = fact.provenanceIds.map((id) => value.provenance.find((source) => source.id === id));
    if (
      approval.statement !== fact.statement || approval.basis !== fact.basis ||
      JSON.stringify(approval.provenance) !== JSON.stringify(sources) ||
      Date.parse(approval.confirmedAt) < Date.parse(value.createdAt) ||
      Date.parse(approval.confirmedAt) > Date.parse(value.updatedAt)
    ) {
      ctx.addIssue({ code: "custom", path: ["facts"], message: "Confirmation does not match current evidence" });
    }
  }
});

export const intakeMetadataSchema = z.strictObject({
  contextId: identifier,
  projectId: identifier,
  briefSourceId: identifier,
  createdAt: timestamp,
});
export const factConfirmationCommandSchema = z.strictObject({
  expectedRevision: z.number().int().positive(),
  factIds: z.array(identifier).min(1).max(100),
}).superRefine((value, ctx) => checkUnique(value.factIds, ["factIds"], ctx));
export const humanReviewMetadataSchema = z.strictObject({
  actorId: identifier,
  confirmedAt: timestamp,
});

export type RawBusinessBrief = z.output<typeof rawBusinessBriefSchema>;
export type RawBusinessBriefInput = z.input<typeof rawBusinessBriefSchema>;
export type BrandContext = z.output<typeof brandContextSchema>;
export type Provenance = z.output<typeof provenanceSchema>;
export type IntakeMetadata = z.output<typeof intakeMetadataSchema>;
export type HumanReviewMetadata = z.output<typeof humanReviewMetadataSchema>;
