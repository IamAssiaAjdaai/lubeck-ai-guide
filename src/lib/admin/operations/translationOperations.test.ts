import { describe, expect, it } from "vitest";

import { locales } from "@/lib/i18n";
import {
  TRANSLATION_FOCUS_LOCALES,
  deriveTranslationState,
  getTranslationCompleteness,
  translationEditorHref,
} from "@/lib/admin/operations/translationOperations";

const working = {
  locale: "fr",
  name: "Porte",
  shortDescription: "Une porte",
  description: null,
  story: "Histoire",
  visitNotes: null,
  facts: [],
} as const;

describe("translation operations", () => {
  it("uses the canonical 27 locales and the requested focus subset", () => {
    expect(locales).toHaveLength(27);
    expect(TRANSLATION_FOCUS_LOCALES).toEqual([
      "de", "en", "da", "nl", "sv", "fr", "tr",
    ]);
    expect(TRANSLATION_FOCUS_LOCALES.every((locale) => locales.includes(locale))).toBe(true);
  });

  it("derives missing, published, draft, review and approved per locale", () => {
    expect(deriveTranslationState({ placeStatus: "draft" })).toBe("missing");
    const published = {
      ...working,
      description: undefined,
      visitNotes: undefined,
      facts: [],
    };
    expect(deriveTranslationState({ working, published, placeStatus: "draft" })).toBe("published");
    expect(deriveTranslationState({ working: { ...working, story: "Changed" }, published, placeStatus: "draft" })).toBe("draft");
    expect(deriveTranslationState({ working: { ...working, story: "Changed" }, published, placeStatus: "in_review" })).toBe("in_review");
    expect(deriveTranslationState({ working: { ...working, story: "Changed" }, published, placeStatus: "approved" })).toBe("approved");
  });

  it("keeps unchanged locales published when only one locale changes", () => {
    const englishWorking = { ...working, locale: "en", name: "Gate", story: "Changed" } as const;
    const englishPublished = { ...englishWorking, story: "Original", description: undefined, visitNotes: undefined };
    const germanWorking = { ...working, locale: "de", name: "Tor" } as const;
    const germanPublished = { ...germanWorking, description: undefined, visitNotes: undefined };
    expect(deriveTranslationState({ working: englishWorking, published: englishPublished, placeStatus: "draft" })).toBe("draft");
    expect(deriveTranslationState({ working: germanWorking, published: germanPublished, placeStatus: "draft" })).toBe("published");
  });

  it("requires only name and short description while reporting optional coverage", () => {
    const result = getTranslationCompleteness(working);
    expect(result.requiredComplete).toBe(true);
    expect(result.fields.description).toBe(false);
    expect(result.fields.facts).toBe(false);
  });

  it("links matrix cells to the existing locale editor", () => {
    expect(translationEditorHref(42, "ar")).toBe("/admin/places/42?locale=ar");
  });
});
