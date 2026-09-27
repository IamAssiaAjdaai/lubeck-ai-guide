import { t } from "@citywalk/i18n";
import { describe, expect, it } from "vitest";

import { getCityPassCopy } from "@/lib/commerce/cityPassCopy";
import { LUBECK_CITY_PASS } from "@/lib/commerce/cityPassConfig";
import { locales } from "@/lib/i18n";

describe("city pass copy", () => {
  it("provides safe complete copy for every CITYWALK locale", () => {
    for (const locale of locales) {
      const copy = getCityPassCopy(LUBECK_CITY_PASS, locale);
      expect(copy.title).not.toBe("");
      expect(copy.benefits).toHaveLength(5);
      expect(copy.unlock).toContain("{price}");
      expect(copy.trust).not.toBe("");
    }
  });

  it("localizes the manually accepted English, German, French, and Arabic experiences", () => {
    expect(getCityPassCopy(LUBECK_CITY_PASS, "en").actualLocale).toBe("en");
    expect(getCityPassCopy(LUBECK_CITY_PASS, "de").actualLocale).toBe("de");
    expect(getCityPassCopy(LUBECK_CITY_PASS, "fr").actualLocale).toBe("fr");
    expect(getCityPassCopy(LUBECK_CITY_PASS, "ar").actualLocale).toBe("ar");
  });
});

it.each(["da", "sv", "nl", "es"] as const)("uses shared %s checkout UI without relabeling English editorial copy", locale => {
  const copy = getCityPassCopy(LUBECK_CITY_PASS, locale);
  expect(copy.actualLocale).toBe(locale);
  expect(copy.editorialLocale).toBe("en");
  expect(copy.unlock).toBe(t(locale, "cityPass.unlock"));
  expect(copy.checkoutLoading).toBe(t(locale, "commerce.startingCheckout"));
  expect(copy.title).toBe(getCityPassCopy(LUBECK_CITY_PASS, "en").title);
});
