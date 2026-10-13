// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  brandContextSchema,
  confirmBrandFacts,
  createBrandContext,
  createBrandContextFromAdapter,
  getApprovedBrandFacts,
  rawBusinessBriefAdapter,
  rawBusinessBriefSchema,
  redactObviousCredentials,
} from "../src/index";
import { citywalkBrief, germanSmeBrief } from "./fixtures";

const metadata = {
  contextId: "context-001",
  projectId: "project-001",
  briefSourceId: "brief-001",
  createdAt: "2026-10-13T10:00:00Z",
};
const reviewer = { actorId: "human-001", confirmedAt: "2026-10-13T11:00:00Z" };

describe("generic Project / Brand Context", () => {
  it.each([citywalkBrief, germanSmeBrief])("validates a business brief without granting factual approval", (brief) => {
    const context = createBrandContextFromAdapter(rawBusinessBriefAdapter, brief, metadata);
    expect(brandContextSchema.safeParse(context).success).toBe(true);
    expect(context.identity.name).toBe(brief.identity.name);
    expect(context.offerings).toHaveLength(1);
    expect(context.targetAudiences).toHaveLength(1);
    expect(context.marketingGoals).toHaveLength(1);
    expect(context.tone.forbiddenClaims).toHaveLength(1);
    expect(context.provenance[0].kind).toBe("raw_brief");
    expect(getApprovedBrandFacts(context)).toEqual([]);
    expect(context.hypotheses).toHaveLength(1);
    expect(context.missingInformation).toEqual(brief.missingInformation);
  });

  it("accepts a minimal named narrative and reports gaps without inventing details", () => {
    const context = createBrandContext({ rawText: "We have a new service.", identity: { name: "A new business" } }, metadata);
    expect(context.offerings).toEqual([]);
    expect(context.facts).toEqual([]);
    expect(context.identity.summary).toBeUndefined();
    expect(context.missingInformation.map((item) => item.field)).toEqual([
      "identity", "offerings", "target_audiences", "marketing_goals", "tone", "markets", "languages", "facts",
    ]);
  });

  it("supports languages and markets independently of any host locale inventory", () => {
    const context = createBrandContext({ ...germanSmeBrief, languages: ["ja", "pt-BR", "hi-IN"], markets: [{ id: "japan", name: "Japan", countryCode: "JP" }] }, metadata);
    expect(context.languages).toEqual(["ja", "pt-BR", "hi-IN"]);
  });

  it("retains custom questions while deriving gaps with collision-free identifiers", () => {
    const context = createBrandContext({
      rawText: "A new business.",
      identity: { name: "Example" },
      missingInformation: [{ id: "missing:offerings", field: "other", question: "What is the budget?" }],
    }, metadata);
    expect(context.missingInformation[0].question).toBe("What is the budget?");
    expect(context.missingInformation.find((item) => item.field === "offerings")?.id).toBe("missing:offerings:1");
  });

  it("confirms only explicitly selected facts and preserves source evidence", () => {
    const context = createBrandContext(citywalkBrief, metadata);
    const before = structuredClone(context);
    const confirmed = confirmBrandFacts(context, { expectedRevision: 1, factIds: ["product"] }, reviewer);
    expect(context).toEqual(before);
    expect(confirmed.revision).toBe(2);
    expect(getApprovedBrandFacts(confirmed)).toEqual([{
      id: "product",
      statement: "CITYWALK offers self-guided city walks.",
      basis: "source_backed",
      provenance: [{ id: "product-brief", kind: "document", label: "Owner-supplied product brief" }],
      confirmedBy: reviewer.actorId,
      confirmedAt: reviewer.confirmedAt,
    }]);
    expect(confirmed.facts[1].confirmation).toBeNull();
    expect(confirmed.hypotheses).toEqual(context.hypotheses);
  });

  it("supports user-confirmed SME facts without claiming independent verification", () => {
    const context = createBrandContext(germanSmeBrief, metadata);
    const confirmed = confirmBrandFacts(context, { expectedRevision: 1, factIds: ["made-to-order"] }, reviewer);
    expect(getApprovedBrandFacts(confirmed)[0].basis).toBe("user_supplied");
    expect(getApprovedBrandFacts(confirmed)[0].provenance[0].kind).toBe("manual");
  });

  it.each(["weekend", "missing-fact"])("never promotes a hypothesis or unknown ID through confirmation", (id) => {
    const context = createBrandContext(citywalkBrief, metadata);
    expect(() => confirmBrandFacts(context, { expectedRevision: 1, factIds: [id] }, reviewer)).toThrow("UNKNOWN_FACT");
    expect(getApprovedBrandFacts(context)).toEqual([]);
  });

  it("rejects stale review commands and timestamps before the latest revision", () => {
    const context = confirmBrandFacts(createBrandContext(citywalkBrief, metadata), { expectedRevision: 1, factIds: ["product"] }, reviewer);
    expect(() => confirmBrandFacts(context, { expectedRevision: 1, factIds: ["design-partner"] }, reviewer)).toThrow("STALE_REVISION");
    expect(() => confirmBrandFacts(context, { expectedRevision: 2, factIds: ["design-partner"] }, { ...reviewer, confirmedAt: metadata.createdAt })).toThrow("INVALID_REVIEW_TIME");
  });

  it("binds approval to exact statements, provenance and source metadata", () => {
    const confirmed = confirmBrandFacts(createBrandContext(citywalkBrief, metadata), { expectedRevision: 1, factIds: ["product"] }, reviewer);
    for (const mutate of [
      (context: typeof confirmed) => { context.facts[0].statement = "A different claim"; },
      (context: typeof confirmed) => { context.facts[0].basis = "user_supplied"; },
      (context: typeof confirmed) => { context.facts[0].provenanceIds = [metadata.briefSourceId]; },
      (context: typeof confirmed) => { context.provenance[1].label = "Different evidence"; },
    ]) {
      const tampered = structuredClone(confirmed); mutate(tampered);
      expect(() => getApprovedBrandFacts(tampered)).toThrow();
    }
  });

  it("rejects approval flags and reviewer metadata in raw input/commands", () => {
    for (const brief of [
      { ...citywalkBrief, approvedFacts: ["product"] },
      { ...citywalkBrief, cityId: 1 },
      { ...citywalkBrief, facts: [{ id: "x", statement: "Claim", confirmation: reviewer }] },
    ]) expect(rawBusinessBriefSchema.safeParse(brief).success).toBe(false);
    const context = createBrandContext(citywalkBrief, metadata);
    expect(() => confirmBrandFacts(context, { expectedRevision: 1, factIds: ["product"], actorId: "spoofed" }, reviewer)).toThrow();
    expect(() => confirmBrandFacts(context, { expectedRevision: 1, factIds: [] }, reviewer)).toThrow();
    expect(() => confirmBrandFacts(context, { expectedRevision: 1, factIds: ["product", "product"] }, reviewer)).toThrow();
  });

  it("rejects duplicate IDs and dangling provenance", () => {
    for (const brief of [
      { ...citywalkBrief, facts: [{ id: "weekend", statement: "A claim" }] },
      { ...citywalkBrief, facts: [{ id: "new", statement: "A claim", provenanceIds: ["unknown"] }] },
      { ...citywalkBrief, facts: [{ id: "new", statement: "A claim", basis: "source_backed" }] },
      { ...citywalkBrief, provenance: [...citywalkBrief.provenance!, ...citywalkBrief.provenance!] },
      { ...citywalkBrief, languages: ["de", "DE"] },
    ]) expect(rawBusinessBriefSchema.safeParse(brief).success).toBe(false);
    expect(() => createBrandContext(citywalkBrief, { ...metadata, briefSourceId: "product-brief" })).toThrow("RESERVED_SOURCE_ID");
  });

  it("bounds input and rejects malformed language, market, URL and timestamps", () => {
    for (const brief of [
      { ...citywalkBrief, rawText: "x".repeat(20_001) },
      { ...citywalkBrief, identity: { name: " " } },
      { ...citywalkBrief, languages: ["en_US"] },
      { ...citywalkBrief, markets: [{ id: "de", name: "Germany", countryCode: "GER" }] },
      { ...citywalkBrief, identity: { name: "Test", website: "javascript:alert(1)" } },
      { ...citywalkBrief, facts: Array.from({ length: 101 }, (_, i) => ({ id: "fact:" + i, statement: "Claim" })) },
    ]) expect(rawBusinessBriefSchema.safeParse(brief).success).toBe(false);
    expect(() => createBrandContext(citywalkBrief, { ...metadata, createdAt: "2026-02-30T10:00:00Z" })).toThrow();
  });

  it("redacts obvious credentials from narrative and all free-text fields", () => {
    const token = "sk-proj-" + "a".repeat(30);
    const input = { ...germanSmeBrief, rawText: `Business brief. OPENAI_API_KEY=${token}\nPASSWORD=sample-credential`, facts: [{ id: "redaction", statement: `Internal API_KEY=${token}` }] };
    const result = JSON.stringify(createBrandContext(input, metadata));
    expect(result).not.toContain(token);
    expect(result).not.toContain("sample-credential");
    expect(result).toContain("[REDACTED]");
    expect(redactObviousCredentials("Bearer abcdefghijklmnop")).toBe("Bearer [REDACTED]");
    expect(redactObviousCredentials("-----BEGIN PRIVATE KEY-----\nsample\n-----END PRIVATE KEY-----")).toBe("[REDACTED]");
    expect(redactObviousCredentials("https://user:pass@example.test/private")).toBe("[REDACTED]");
    expect(redactObviousCredentials("AWS_SECRET_ACCESS_KEY=sample-value")).toBe("AWS_SECRET_ACCESS_KEY=[REDACTED]");
    expect(rawBusinessBriefSchema.safeParse({ ...germanSmeBrief, identity: { name: "Test", website: "https://user:pass@example.test" } }).success).toBe(false);
  });

  it("round-trips the versioned contract without losing evidence or approval", () => {
    const confirmed = confirmBrandFacts(createBrandContext(germanSmeBrief, metadata), { expectedRevision: 1, factIds: ["made-to-order"] }, reviewer);
    expect(brandContextSchema.parse(JSON.parse(JSON.stringify(confirmed)))).toEqual(confirmed);
    expect(brandContextSchema.safeParse({ ...confirmed, schemaVersion: 2 }).success).toBe(false);
  });
});
