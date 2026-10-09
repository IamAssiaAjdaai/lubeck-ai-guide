import { describe, expect, it } from "vitest";

import {
  evaluateDeterministicContentQa,
  runDeterministicContentQa,
  textSimilarity,
} from "@/lib/contentQa";

describe("runDeterministicContentQa", () => {
  it("returns clean findings for valid, generic content but never factual certification", () => {
    const report = evaluateDeterministicContentQa({
      contentType: "product_announcement",
      fields: [
        { key: "headline", value: "New autumn collection", required: true, maxLength: 60 },
        { key: "action", value: "Explore products", role: "cta" },
      ],
      allowedFactIds: ["fact-1"],
      claims: [{ id: "claim-1", text: "Limited availability", sourceFactIds: ["fact-1"] }],
    });

    expect(report).toEqual({ findings: [], factualCertification: "not_certified" });
  });

  it("reports missing required fields and overly long copy", () => {
    const results = runDeterministicContentQa({
      fields: [
        { key: "title", label: "Title", value: "   ", required: true },
        { key: "caption", value: "123456", maxLength: 5 },
      ],
    });

    expect(results).toEqual([
      expect.objectContaining({
        severity: "error",
        checkId: "field.required",
        affectedField: "title",
      }),
      expect.objectContaining({
        severity: "warning",
        checkId: "field.too_long",
        affectedField: "caption",
      }),
    ]);
  });

  it("uses bounded length constraints without overriding field-specific limits", () => {
    const results = runDeterministicContentQa({
      contentType: "email",
      fields: [
        { key: "subject", value: "123456" },
        { key: "body", value: "123456", maxLength: 10 },
      ],
      lengthConstraints: { subject: 5, body: 3 },
    });
    expect(results.map((result) => result.affectedField)).toEqual(["subject"]);
  });

  it("warns on optional empty and generic CTAs without falsely treating them as verified", () => {
    const results = runDeterministicContentQa({
      fields: [
        { key: "cta1", value: " ", role: "cta" },
        { key: "cta2", value: "Go", role: "cta" },
        { key: "cta3", value: "Click here", role: "cta" },
      ],
    });
    expect(results.map((result) => result.checkId)).toEqual([
      "cta.empty",
      "cta.weak",
      "cta.weak",
    ]);
  });

  it("does not double-warn for an empty required CTA", () => {
    const results = runDeterministicContentQa({
      fields: [{ key: "cta", value: "", required: true, role: "cta" }],
    });
    expect(results.map((result) => result.checkId)).toEqual(["field.required"]);
  });

  it("supports portable brand rules without any CITYWALK or place schema", () => {
    const results = runDeterministicContentQa({
      contentType: "campaign_email",
      brandRules: { forbiddenPhrases: ["guaranteed returns"], minCtaCharacters: 8 },
      fields: [
        { key: "body", value: "Get guaranteed returns on your money." },
        { key: "button", value: "Try now", role: "cta" },
      ],
    });
    expect(results.map((result) => result.checkId)).toEqual([
      "cta.weak",
      "brand.forbidden_phrase",
    ].reverse());
    expect(results.every((result) => result.origin === "deterministic")).toBe(true);
  });

  it("fails safely when claims exist but no verified evidence package is supplied", () => {
    const results = runDeterministicContentQa({
      claims: [{ id: "claim-1", text: "Open every day." }],
    });
    expect(results).toEqual([
      expect.objectContaining({
        severity: "warning",
        checkId: "facts.evidence_unavailable",
        origin: "deterministic",
      }),
    ]);
  });

  it("warns about insufficient evidence when the content type explicitly requires it", () => {
    const results = runDeterministicContentQa({
      contentType: "informational_post",
      requireEvidence: true,
      allowedFactIds: [],
      fields: [{ key: "title", value: "A public transport update" }],
    });
    expect(results).toEqual([
      expect.objectContaining({
        severity: "warning",
        checkId: "facts.insufficient_evidence",
      }),
    ]);
  });

  it("warns for claims without evidence and errors for references outside the allowed package", () => {
    const results = runDeterministicContentQa({
      allowedFactIds: ["fact-1"],
      claims: [
        { id: "claim-1", text: "Supported wording", sourceFactIds: ["fact-1"] },
        { id: "claim-2", text: "No evidence", sourceFactIds: [], affectedField: "caption" },
        { id: "claim-3", text: "Unknown evidence", sourceFactIds: ["fact-404"], affectedField: "script" },
      ],
    });
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      checkId: "facts.claim_without_evidence",
      affectedField: "caption",
      evidence: [{ kind: "claim", id: "claim-2" }],
    });
    expect(results[1]).toMatchObject({
      severity: "error",
      checkId: "facts.unknown_evidence_reference",
      evidence: [{ kind: "source_fact", id: "fact-404" }],
    });
  });

  it("does not accept fabricated source references outside the supplied package", () => {
    const results = runDeterministicContentQa({
      allowedFactIds: ["fact-a"],
      sourceReferences: [{ id: "src-a", url: "https://example.org/source" }],
      claims: [{
        id: "claim-1",
        text: "Grounded claim",
        sourceFactIds: ["fact-a"],
        sourceReferenceIds: ["src-nope"],
        affectedField: "body",
      }],
    });
    expect(results).toEqual([
      expect.objectContaining({
        checkId: "facts.unknown_source_reference",
        affectedField: "body",
        evidence: [{ kind: "source", id: "src-nope" }],
      }),
    ]);
  });

  it("fails safely when a claim cites sources but the bounded source package is missing", () => {
    const results = runDeterministicContentQa({
      allowedFactIds: ["fact-a"],
      claims: [{
        id: "claim-1",
        text: "Bounded fact",
        sourceFactIds: ["fact-a"],
        sourceReferenceIds: ["src-a"],
      }],
    });
    expect(results.map((result) => result.checkId)).toEqual(["facts.sources_unavailable"]);
  });

  it("flags structured price and hours claims only for explicitly unavailable fact categories", () => {
    const results = runDeterministicContentQa({
      allowedFactIds: ["fact-1"],
      factAvailability: { price: "unavailable", opening_hours: "unavailable" },
      claims: [
        { id: "price-claim", text: "Tickets are $15", kind: "price", sourceFactIds: ["fact-1"] },
        { id: "hours-claim", text: "Open daily", kind: "opening_hours", sourceFactIds: ["fact-1"] },
      ],
    });
    expect(results.map((result) => result.checkId)).toEqual([
      "facts.price_unavailable",
      "facts.opening_hours_unavailable",
    ]);
  });

  it("flags obvious unsupported currency and time-range copy with bounded unavailable facts", () => {
    const results = runDeterministicContentQa({
      factAvailability: { price: "unavailable", opening_hours: "unavailable" },
      fields: [
        { key: "price", value: "Tickets are €12 per person." },
        { key: "hours", value: "Open 09:00–18:30 every day." },
      ],
    });
    expect(results.map((result) => result.checkId)).toEqual([
      "facts.price_unavailable",
      "facts.opening_hours_unavailable",
    ]);
    expect(results.every((result) => result.severity === "warning")).toBe(true);
  });

  it("does not infer unsupported price or hours from unknown fact availability", () => {
    const results = runDeterministicContentQa({
      factAvailability: { price: "unknown" },
      fields: [{ key: "details", value: "€12; 09:00–18:30" }],
    });
    expect(results).toEqual([]);
  });

  it("does not report the same unavailable structured claim and field twice", () => {
    const results = runDeterministicContentQa({
      allowedFactIds: ["fact-a"],
      factAvailability: { price: "unavailable" },
      fields: [{ key: "caption", value: "Tickets €12" }],
      claims: [
        { id: "claim-a", text: "Tickets €12", kind: "price", affectedField: "caption", sourceFactIds: ["fact-a"] },
      ],
    });
    expect(results.map((result) => result.checkId)).toEqual(["facts.price_unavailable"]);
  });

  it("flags normalized duplicates", () => {
    const results = runDeterministicContentQa({
      duplicateChecks: [{
        field: "caption",
        value: "Discover Hamburg on foot with a calm CITYWALK route today.",
        compareAgainst: [{
          id: "existing-1",
          label: "Previous caption",
          text: "Discover Hamburg on foot with a calm CITYWALK route today!",
        }],
      }],
    });
    expect(results).toEqual([
      expect.objectContaining({
        checkId: "copy.near_duplicate",
        affectedField: "caption",
        evidence: [{ kind: "comparison", id: "existing-1", label: "Previous caption" }],
      }),
    ]);
  });

  it("does not flag unrelated copy", () => {
    const results = runDeterministicContentQa({
      duplicateChecks: [{
        field: "caption",
        value: "Explore Hamburg harbour architecture on foot today.",
        compareAgainst: [{ id: "existing-1", text: "Save your favorite walks and continue them later." }],
      }],
    });
    expect(results).toEqual([]);
  });
});

describe("textSimilarity", () => {
  it("treats punctuation and casing differences as the same copy", () => {
    expect(textSimilarity("Hello, CITYWALK!", "hello citywalk")).toBe(1);
  });

  it("avoids fuzzy matching very short phrases", () => {
    expect(textSimilarity("Visit Hamburg", "Hamburg visit")).toBe(0);
  });
});
