import { describe, expect, it } from "vitest";
import { createBrandContext, confirmBrandFacts } from "@marketing/core";
import { citywalkBrief, germanSmeBrief } from "../../../../packages/marketing-core/tests/fixtures";
import { canonicalJson, confirmRequest, createRequest, validateStoredContext } from "./validation";

const contextId = "8ef54fd0-962b-48a2-bf69-28ace4d30083", projectId = "82c88f92-f734-4fdb-b2c4-a688580c2ba5";
const context = () => createBrandContext(citywalkBrief, { contextId, projectId, briefSourceId: "brief", createdAt: "2026-10-13T12:00:00Z" });
describe("brand persistence trust boundary", () => {
  it.each([citywalkBrief, germanSmeBrief])("accepts the same generic input from distinct businesses", brief => {
    expect(createRequest.parse({ campaignId: 1, brief }).brief.identity).toEqual(brief.identity);
  });
  it("rejects browser ownership, reviewer, timestamps and preapproved context", () => {
    for (const key of ["actorId", "confirmedAt", "reviewerId", "cityId", "context", "schemaVersion"]) {
      expect(() => createRequest.parse({ campaignId: 1, brief: citywalkBrief, [key]: "forged" })).toThrow();
      expect(() => confirmRequest.parse({ projectId, contextId, command: { expectedRevision: 1, factIds: ["product"] }, [key]: "forged" })).toThrow();
    }
    expect(() => createRequest.parse({ campaignId: 1, brief: context() })).toThrow();
    expect(() => confirmRequest.parse({ projectId, contextId, command: { expectedRevision: 1, factIds: ["product"], actorId: "forged", evidence: {} } })).toThrow();
  });
  it("rejects unsupported versions and altered confirmed evidence", () => {
    const approved = confirmBrandFacts(context(), { expectedRevision: 1, factIds: ["product"] }, { actorId: "reviewer", confirmedAt: "2026-10-13T12:01:00Z" });
    expect(validateStoredContext(approved)).toEqual(approved);
    expect(() => validateStoredContext({ ...approved, schemaVersion: 2 })).toThrow();
    expect(() => validateStoredContext({ ...approved, facts: approved.facts.map(f => ({ ...f, statement: "Altered evidence" })) })).toThrow();
    expect(() => validateStoredContext({ ...approved, provenance: approved.provenance.map(p => ({ ...p, label: "Altered source" })) })).toThrow();
  });
  it("does not silently normalize stored evidence and hashes JSON independent of key order", () => {
    expect(() => validateStoredContext({ ...context(), rawText: " padded input " })).toThrow();
    expect(canonicalJson({ b: [1, 2], a: "x" })).toEqual(canonicalJson({ a: "x", b: [1, 2] }));
    expect(canonicalJson({ b: [2, 1] })).not.toEqual(canonicalJson({ b: [1, 2] }));
  });
});
