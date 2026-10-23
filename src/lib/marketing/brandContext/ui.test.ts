import { describe, expect, it } from "vitest";
import { createBrandContext, confirmBrandFacts, rawBusinessBriefSchema } from "@marketing/core";
import { citywalkBrief, germanSmeBrief } from "../../../../packages/marketing-core/tests/fixtures";
import { correctionBrief, emptyBrief } from "./ui";
describe("Brand form conversion", () => {
  it("starts empty without invented business information", () => {
    expect(emptyBrief().identity.name).toBe(""); expect(emptyBrief().rawText).toBe("");
    expect(() => rawBusinessBriefSchema.parse(emptyBrief())).toThrow();
  });
  it("keeps every question visible when Core has added gaps beyond the raw-input limit", () => {
    const context = createBrandContext({ rawText: "Brief", identity: { name: "Business" }, missingInformation: Array.from({ length: 40 }, (_, i) => ({ id: `q${i}`, field: "other", question: `Question ${i}` })) }, { projectId: "p", contextId: "c", briefSourceId: "input", createdAt: "2026-10-13T12:00:00Z" });
    const input = correctionBrief(context);
    expect(input.missingInformation).toEqual(context.missingInformation);
    expect(input.missingInformation.length).toBeGreaterThan(40);
    expect(() => rawBusinessBriefSchema.parse(input)).toThrow(); // Staff must explicitly reduce; no silent loss.
  });
  it.each([citywalkBrief, germanSmeBrief])("returns reusable raw input while excluding prior approvals", brief => {
    const context = createBrandContext(brief, { projectId: "project", contextId: "context", briefSourceId: "input", createdAt: "2026-10-13T12:00:00Z" });
    const confirmed = confirmBrandFacts(context, { expectedRevision: 1, factIds: [context.facts[0].id] }, { actorId: "reviewer", confirmedAt: "2026-10-13T12:01:00Z" });
    const input = correctionBrief(confirmed);
    expect(rawBusinessBriefSchema.parse(input)).toEqual(input);
    expect(input.facts.every(f => !("confirmation" in f))).toBe(true);
    expect(input.provenance).toEqual(brief.provenance);
    expect(input).not.toHaveProperty("projectId"); expect(input).not.toHaveProperty("schemaVersion");
    expect(createBrandContext(input, { projectId: "project", contextId: "context", briefSourceId: "new-input", createdAt: "2026-10-13T12:02:00Z" }).facts.every(f => f.confirmation === null)).toBe(true);
  });
});
