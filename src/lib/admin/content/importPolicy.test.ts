import { describe, expect, it } from "vitest";

import {
  canBootstrapCanonicalRecord,
  canRefreshCanonicalLocalization,
} from "@/lib/admin/content/importPolicy";

describe("canonical CMS import policy", () => {
  it("imports newly created and empty legacy records", () => {
    expect(canBootstrapCanonicalRecord({
      created: true,
      existingLocalizationCount: 0,
      updatedByUserId: null,
    })).toBe(true);
    expect(canBootstrapCanonicalRecord({
      created: false,
      existingLocalizationCount: 0,
      updatedByUserId: null,
    })).toBe(true);
  });

  it("does not overwrite authenticated editorial work", () => {
    expect(canBootstrapCanonicalRecord({
      created: false,
      existingLocalizationCount: 0,
      updatedByUserId: "staff-user",
    })).toBe(false);
    expect(canBootstrapCanonicalRecord({
      created: false,
      existingLocalizationCount: 1,
      updatedByUserId: null,
    })).toBe(false);
  });

  it("refreshes only city localizations that remain canonical bootstrap data", () => {
    expect(canRefreshCanonicalLocalization({
      recordUpdatedByUserId: null,
      localizationUpdatedByUserId: null,
    })).toBe(true);
    expect(canRefreshCanonicalLocalization({
      recordUpdatedByUserId: "staff-user",
      localizationUpdatedByUserId: null,
    })).toBe(false);
    expect(canRefreshCanonicalLocalization({
      recordUpdatedByUserId: null,
      localizationUpdatedByUserId: "staff-user",
    })).toBe(false);
  });
});
