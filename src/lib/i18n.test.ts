import { describe, expect, it } from "vitest";

import {
  formatMessage,
  getDirection,
  getTranslations,
  isLocale,
  languages,
  locales,
} from "./i18n";

function keys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => keys(child, prefix ? `${prefix}.${key}` : key));
}

describe("i18n", () => {
  it("keeps the visitor-priority order with Arabic last", () => {
    expect(locales.slice(0, 11)).toEqual(["de", "da", "nl", "sv", "en", "fr", "fi", "no", "pl", "it", "es"]);
    expect(locales.at(-1)).toBe("ar");
    expect(new Set(locales).size).toBe(27);
  });

  it("formats the arrival place name in every locale", () => {
    for (const locale of locales) {
      const message = formatMessage(
        getTranslations(locale).location.arrival,
        {
          place: "Holstentor",
        },
      );

      expect(message).toContain("Holstentor");
      expect(message).not.toContain("{place}");
      expect(message).not.toContain("{placeName}");
  }
  });
  
  it("provides matching dictionary structures for every locale", () => {
    const englishKeys = keys(getTranslations("en"));
    for (const locale of locales) {
      expect(keys(getTranslations(locale))).toEqual(englishKeys);
      expect(languages[locale].locale).toBe(locale);
      expect(isLocale(locale)).toBe(true);
    }
  });

  it("uses RTL only for Arabic", () => {
    for (const locale of locales) {
      expect(getDirection(locale)).toBe(locale === "ar" ? "rtl" : "ltr");
    }
  });

  it("provides localized missing-audio UI for every priority locale", () => {
    const priorityLocales = [
      "de",
      "en",
      "da",
      "nl",
      "sv",
      "fr",
      "tr",
    ] as const;
    const englishLabel =
      getTranslations("en").landmark
        .audioUnavailable;

    for (const locale of priorityLocales) {
      const label =
        getTranslations(locale).landmark
          .audioUnavailable;

      expect(label.trim()).not.toBe("");

      if (locale !== "en") {
        expect(label).not.toBe(englishLabel);
      }
    }
  });
});
