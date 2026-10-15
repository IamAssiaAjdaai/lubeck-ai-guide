import { describe, expect, it } from "vitest";
import { blankIntake, validateProjectIntake } from "./intake";

const website = {
  ...blankIntake,
  name: "Nordlicht Studio",
  websiteUrl: "https://studio.example",
  description: "We provide creative services for local businesses.",
  goal: "Find more local clients",
  ownerClaim: "We offer design consulting.",
};

describe("marketing SaaS customer intake (untrusted owner-declared input)", () => {
  it("maps website to existing @marketing/core with unconfirmed owner claims", () => {
    const result = validateProjectIntake(website);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.brief.identity.name).toBe("Nordlicht Studio");
    expect(result.brief.identity.website).toBe("https://studio.example");
    expect(result.brief.facts).toEqual([{
      id: "owner-claim",
      statement: "We offer design consulting.",
      basis: "user_supplied",
      provenanceIds: [],
    }]);
    expect(result.brief.marketingGoals).toHaveLength(1);
    expect(result.brief.provenance).toEqual([]);
  });
  it("accepts local businesses without a website, preserves location and goal", () => {
    const result = validateProjectIntake({
      ...website, kind: "local", city: "Düsseldorf", websiteUrl: "",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.brief.identity.website).toBeUndefined();
    expect(result.brief.markets[0]?.name).toBe("Düsseldorf");
  });
  it("accepts app projects with an HTTPS URL", () => {
    const result = validateProjectIntake({ ...website, kind: "app" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.brief.identity.businessType).toBe("App business");
  });
  it("rejects non-HTTPS, embedded credentials, unsafe protocol and missing URLs", () => {
    for (const url of ["", "http://example.org", "https://user:pass@example.com", "javascript:alert(1)", "a website"]) {
      const result = validateProjectIntake({ ...website, websiteUrl: url });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.websiteUrl).toBeDefined();
    }
  });
  it("requires a city for a local business and validates other required fields", () => {
    const result = validateProjectIntake({
      ...website, kind: "local", websiteUrl: "", city: "", name: "x", description: "short", goal: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.city).toBeDefined();
      expect(result.errors.name).toBeDefined();
      expect(result.errors.description).toBeDefined();
      expect(result.errors.goal).toBeDefined();
    }
  });
  it("does not invent facts from a name or URL when no claim is entered", () => {
    const result = validateProjectIntake({ ...website, ownerClaim: "" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.brief.facts).toEqual([]);
    expect(result.brief.provenance).toEqual([]);
    expect(result.brief.marketingGoals[0].description).toBe("Find more local clients");
  });
  it("rejects overly large budgets and trims owner fields", () => {
    const bad = validateProjectIntake({ ...website, monthlyBudget: "1000000" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.monthlyBudget).toBeDefined();
    const good = validateProjectIntake({ ...website, monthlyBudget: "100", name: " Nordlicht Studio " });
    expect(good.ok).toBe(true);
    if (good.ok) expect(good.brief.identity.name).toBe("Nordlicht Studio");
  });
});
