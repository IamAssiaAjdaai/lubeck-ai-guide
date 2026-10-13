import {
  brandContextSchema,
  factConfirmationCommandSchema,
  humanReviewMetadataSchema,
  intakeMetadataSchema,
  rawBusinessBriefSchema,
  type BrandContext,
  type IntakeMetadata,
} from "./schema";

/** A semantic conflict; contains no submitted brief text or secret values. */
export class BrandContextConflictError extends Error {
  constructor(readonly code: "STALE_REVISION" | "UNKNOWN_FACT" | "INVALID_REVIEW_TIME" | "RESERVED_SOURCE_ID") {
    super(code);
    this.name = "BrandContextConflictError";
  }
}

export function createBrandContext(
  rawBrief: unknown,
  metadata: IntakeMetadata,
): BrandContext {
  const brief = rawBusinessBriefSchema.parse(rawBrief);
  const intake = intakeMetadataSchema.parse(metadata);
  if (brief.provenance.some((source) => source.id === intake.briefSourceId)) {
    throw new BrandContextConflictError("RESERVED_SOURCE_ID");
  }
  const missingInformation = [...brief.missingInformation];
  function missingId(field: string) {
    const base = "missing:" + field;
    let id = base;
    let suffix = 1;
    while (missingInformation.some((item) => item.id === id)) {
      id = base + ":" + suffix++;
    }
    return id;
  }
  const questions = [
    ["offerings", "What products or services does the business offer?", brief.offerings.length],
    ["target_audiences", "Who should the marketing reach?", brief.targetAudiences.length],
    ["marketing_goals", "What should the marketing achieve?", brief.marketingGoals.length],
    ["tone", "How should the brand sound?", brief.tone.voice.length],
    ["markets", "Which markets should the marketing serve?", brief.markets.length],
    ["languages", "Which languages should the marketing use?", brief.languages.length],
    ["facts", "Which business claims can a human confirm?", brief.facts.length],
  ] as const;
  if (!brief.identity.summary && !missingInformation.some((item) => item.field === "identity")) {
    missingInformation.push({ id: missingId("identity"), field: "identity", question: "How does the business create value?" });
  }
  for (const [field, question, count] of questions) {
    if (count === 0 && !missingInformation.some((item) => item.field === field)) {
      missingInformation.push({ id: missingId(field), field, question });
    }
  }
  return brandContextSchema.parse({
    ...brief,
    ...intake,
    schemaVersion: 1,
    revision: 1,
    updatedAt: intake.createdAt,
    provenance: [
      { id: intake.briefSourceId, kind: "raw_brief", label: "Business brief", observedAt: intake.createdAt },
      ...brief.provenance,
    ],
    facts: brief.facts.map((fact) => ({
      ...fact,
      provenanceIds: fact.provenanceIds.length ? fact.provenanceIds : [intake.briefSourceId],
      confirmation: null,
    })),
    missingInformation,
  });
}

/**
 * Call only after the host authenticates a human reviewer and authorizes this
 * project. Reviewer identity/time come from the host, never the request body.
 * This is a pure transition, not a session, authorization or persistence layer.
 */
export function confirmBrandFacts(
  storedContext: unknown,
  rawCommand: unknown,
  reviewerMetadata: unknown,
): BrandContext {
  const context = brandContextSchema.parse(storedContext);
  const command = factConfirmationCommandSchema.parse(rawCommand);
  const reviewer = humanReviewMetadataSchema.parse(reviewerMetadata);
  if (command.expectedRevision !== context.revision) {
    throw new BrandContextConflictError("STALE_REVISION");
  }
  if (Date.parse(reviewer.confirmedAt) < Date.parse(context.updatedAt)) {
    throw new BrandContextConflictError("INVALID_REVIEW_TIME");
  }
  if (command.factIds.some((id) => !context.facts.some((fact) => fact.id === id))) {
    throw new BrandContextConflictError("UNKNOWN_FACT");
  }
  return brandContextSchema.parse({
    ...context,
    revision: context.revision + 1,
    updatedAt: reviewer.confirmedAt,
    facts: context.facts.map((fact) => command.factIds.includes(fact.id) ? {
      ...fact,
      confirmation: {
        ...reviewer,
        statement: fact.statement,
        basis: fact.basis,
        provenance: fact.provenanceIds.map((id) => context.provenance.find((source) => source.id === id)),
      },
    } : fact),
  });
}

/** A private domain view, not a public DTO or a RAG verification certificate. */
export function getApprovedBrandFacts(storedContext: unknown) {
  return brandContextSchema.parse(storedContext).facts.flatMap((fact) =>
    fact.confirmation ? [{
      id: fact.id,
      statement: fact.statement,
      basis: fact.basis,
      provenance: fact.confirmation.provenance,
      confirmedBy: fact.confirmation.actorId,
      confirmedAt: fact.confirmation.confirmedAt,
    }] : [],
  );
}
