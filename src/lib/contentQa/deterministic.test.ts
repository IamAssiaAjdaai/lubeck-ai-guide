import { describe, expect, it } from "vitest";

import {
  runDeterministicContentQa,
  textSimilarity,
} from "@/lib/contentQa/deterministic";

describe("runDeterministicContentQa", () => {
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

  it("fails safely when claims exist but no verified evidence package is supplied", () => {
    const results = runDeterministicContentQa({
      claims: [{ id: "claim-1", text: "The Plaza is open every day." }],
    });

    expect(results).toEqual([
      expect.objectContaining({
        severity: "warning",
        checkId: "facts.evidence_unavailable",
        origin: "deterministic",
      }),
    ]);
  });

  it("warns for claims without evidence and errors for references outside the allowed package", () => {
    const results = runDeterministicContentQa({
      allowedFactIds: ["fact-1"],
      claims: [
        {
          id: "claim-1",
          text: "Supported wording",
          sourceFactIds: ["fact-1"],
          affectedField: "body",
        },
        {
          id: "claim-2",
          text: "No evidence",
          sourceFactIds: [],
          affectedField: "caption",
        },
        {
          id: "claim-3",
          text: "Unknown evidence",
          sourceFactIds: ["fact-404"],
          affectedField: "script",
        },
      ],
    });

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      checkId: "facts.claim_without_evidence",
      affectedField: "caption",
    });
    expect(results[1]).toMatchObject({
      severity: "error",
      checkId: "facts.unknown_evidence_reference",
      affectedField: "script",
      evidence: [{ kind: "source_fact", id: "fact-404" }],
    });
  });

  it("flags normalized duplicate or near-duplicate copy", () => {
    const results = runDeterministicContentQa({
      duplicateChecks: [
        {
          field: "caption",
          value: "Discover Hamburg on foot with a calm CITYWALK route today.",
          compareAgainst: [
            {
              id: "existing-1",
              label: "Previous Instagram caption",
              text: "Discover Hamburg on foot with a calm CITYWALK route today!",
            },
          ],
        },
      ],
    });

    expect(results).toEqual([
      expect.objectContaining({
        checkId: "copy.near_duplicate",
        affectedField: "caption",
        evidence: [
          {
            kind: "comparison",
            id: "existing-1",
            label: "Previous Instagram caption",
          },
        ],
      }),
    ]);
  });

  it("does not flag unrelated copy", () => {
    const results = runDeterministicContentQa({
      duplicateChecks: [
        {
          field: "caption",
          value: "Explore Hamburg harbour architecture on foot today.",
          compareAgainst: [
            {
              id: "existing-1",
              text: "Save your favorite walks and continue them later.",
            },
          ],
        },
      ],
    });

    expect(results).toEqual([]);
  });

  it("returns no fake success result when deterministic checks find nothing", () => {
    expect(
      runDeterministicContentQa({
        fields: [{ key: "title", value: "Hamburg", required: true, maxLength: 50 }],
        allowedFactIds: ["fact-1"],
        claims: [
          {
            id: "claim-1",
            text: "Grounded claim",
            sourceFactIds: ["fact-1"],
          },
        ],
      }),
    ).toEqual([]);
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
