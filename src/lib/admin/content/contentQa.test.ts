import { describe, expect, it } from "vitest";
import {
  buildCmsPlaceQaInput,
  buildCmsTourQaInput,
  checkCmsPlaceQa,
  checkCmsTourQa,
  type CmsQaPlace,
  type CmsQaTour,
} from "./contentQa";
import { runDeterministicContentQa } from "@/lib/contentQa/deterministic";

const place: CmsQaPlace = {
  localizations: [{
    locale: "en",
    name: "Holstentor",
    shortDescription: "Historic gate in Lübeck.",
    description: "The museum is open 09:00–19:00.",
    story: "A notable landmark.",
    visitNotes: null,
    facts: [{ label: "Opening", value: "09:00–19:00" }],
  }],
  sourceLinks: [],
};
const tour: CmsQaTour = {
  localizations: [{
    locale: "en",
    title: "Lübeck highlights",
    shortDescription: "A walk through the centre.",
    description: "See the old city.",
  }],
  estimatedDurationMinutes: 45,
  stops: [
    { placeId: 21, position: 1, visitDurationMinutes: 30 },
    { placeId: 22, position: 2, visitDurationMinutes: 20 },
  ],
};

describe("CMS Place and Tour QA adapters", () => {
  it("does not launder editor facts or source links into verified evidence", () => {
    const input = buildCmsPlaceQaInput(place, "en");
    expect(input.requireEvidence).toBe(true);
    expect(input.verifiedFacts).toBeUndefined();
    expect(input.allowedFactIds).toBeUndefined();
    expect(input.sourceReferences).toBeUndefined();
    expect(input.fields).toContainEqual(expect.objectContaining({
      key: "fact_0",
      value: "Opening: 09:00–19:00",
    }));
  });

  it("flags opening hours and source gaps deterministically", () => {
    const findings = runDeterministicContentQa(buildCmsPlaceQaInput(place, "en"));
    expect(findings.map((f) => f.checkId)).toContain("facts.opening_hours_unavailable");
    expect(checkCmsPlaceQa(place).map((f) => f.checkId)).toEqual(["sources.missing"]);
  });

  it("flags stale required links but never treats a valid link as a verified chunk", () => {
    const source = { required: true, source: { verifiedAt: "2026-01-01", validUntil: "2026-06-01" } };
    expect(checkCmsPlaceQa({ ...place, sourceLinks: [source] }, new Date("2026-10-09")))
      .toContainEqual(expect.objectContaining({ checkId: "sources.stale_required" }));
    expect(checkCmsPlaceQa({
      ...place,
      sourceLinks: [{ ...source, source: { ...source.source, validUntil: null } }],
    }, new Date("2026-10-09"))).toEqual([]);
  });

  it("checks the requested authored locale without falling back to another language", () => {
    const input = buildCmsPlaceQaInput(place, "de");
    expect(input.fields?.find((f) => f.key === "name")?.value).toBe("");
    expect(runDeterministicContentQa(input)).toContainEqual(expect.objectContaining({
      checkId: "field.required",
      affectedField: "name",
    }));
  });

  it("warns if explicit stop visits exceed the total tour estimate", () => {
    expect(checkCmsTourQa(tour)).toContainEqual(expect.objectContaining({
      checkId: "tour.duration_conflict",
      affectedField: "estimatedDurationMinutes",
    }));
  });

  it("does not invent travel time or warn when explicit visits fit the estimate", () => {
    expect(checkCmsTourQa({ ...tour, estimatedDurationMinutes: 65 })).toEqual([]);
    expect(checkCmsTourQa({
      ...tour,
      estimatedDurationMinutes: 20,
      stops: [{ placeId: 21, position: 1, visitDurationMinutes: null }],
    })).toEqual([]);
  });

  it("warns on an empty tour, and never certifies its copy", () => {
    expect(checkCmsTourQa({ ...tour, stops: [] })).toContainEqual(expect.objectContaining({
      checkId: "tour.stops_missing",
    }));
    expect(buildCmsTourQaInput(tour, "en")).toMatchObject({
      contentType: "cms_tour",
      requireEvidence: true,
    });
    expect(buildCmsTourQaInput(tour, "en").verifiedFacts).toBeUndefined();
  });
});
