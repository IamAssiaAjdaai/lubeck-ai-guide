import { describe, expect, it } from "vitest";

import { runDeterministicContentQa } from "@/lib/contentQa/deterministic";
import {
  buildMarketingPageQaInput,
  buildMarketingSocialQaInput,
} from "./contentQa";

describe("CITYWALK Marketing CMS QA adapters", () => {
  it("maps a saved marketing page into generic fields without inventing trusted facts", () => {
    const input = buildMarketingPageQaInput({
      kind: "landing",
      title: "Visit Lübeck",
      body: "Explore the old town.",
      cta: "Build your walk",
      seoTitle: "Lübeck experiences",
      seoDescription: "Plan a tour of Lübeck.",
    });
    expect(input.contentType).toBe("marketing_landing");
    expect(input.fields?.map((x) => x.key)).toEqual([
      "title", "body", "cta", "seoTitle", "seoDescription",
    ]);
    expect(input.fields?.find((x) => x.key === "cta")?.role).toBe("cta");
    expect(input.requireEvidence).toBe(true);
    expect(input.verifiedFacts).toBeUndefined();
    expect(input.allowedFactIds).toBeUndefined();
    expect(input.claims).toBeUndefined();
  });

  it("flags missing title and SEO overflow deterministically", () => {
    const warnings = runDeterministicContentQa(buildMarketingPageQaInput({
      kind: "blog",
      title: "",
      body: "A short blog draft",
      cta: "Read more",
      seoTitle: "x".repeat(71),
      seoDescription: null,
    }));
    expect(warnings.map((x) => x.checkId)).toContain("field.required");
    expect(warnings.map((x) => x.checkId)).toContain("field.too_long");
    expect(warnings.map((x) => x.checkId)).toContain("cta.weak");
    expect(warnings.map((x) => x.checkId)).toContain("facts.insufficient_evidence");
  });

  it("maps saved social copy, not browser-submitted claims", () => {
    const input = buildMarketingSocialQaInput({
      platform: "instagram",
      format: "reel-short",
      hook: "A day in the city",
      script: "Explore the historic centre",
      caption: "Choose your route",
      cta: "Open CITYWALK",
    });
    expect(input.contentType).toBe("marketing_social");
    expect(input.fields?.map((x) => x.key)).toEqual([
      "platform", "format", "hook", "script", "caption", "cta",
    ]);
    expect(input.allowedFactIds).toBeUndefined();
    expect(input.sourceReferences).toBeUndefined();
  });

  it("flags long social captions, weak CTA and required missing hook", () => {
    const findings = runDeterministicContentQa(buildMarketingSocialQaInput({
      platform: "instagram",
      format: "post",
      hook: " ",
      script: null,
      caption: "x".repeat(2201),
      cta: "Click here",
    }));
    expect(findings.map((x) => x.checkId)).toContain("field.required");
    expect(findings.map((x) => x.checkId)).toContain("field.too_long");
    expect(findings.map((x) => x.checkId)).toContain("cta.weak");
  });
});
