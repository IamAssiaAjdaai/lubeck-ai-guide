import { describe, expect, it } from "vitest";

import { getCityPassCopy } from "@/lib/commerce/cityPassCopy";
import { locales } from "@/lib/i18n";

describe("city pass copy", () => {
  it("provides safe complete copy for every CITYWALK locale", () => {
    for (const locale of locales) {
      const copy = getCityPassCopy(locale);
      expect(copy.title).not.toBe("");
      expect(copy.benefits).toHaveLength(5);
      expect(copy.unlock).toContain("{price}");
      expect(copy.trust).not.toBe("");
    }
  });

  it("localizes the manually accepted English, German, French, and Arabic experiences", () => {
    expect(getCityPassCopy("en").actualLocale).toBe("en");
    expect(getCityPassCopy("de").actualLocale).toBe("de");
    expect(getCityPassCopy("fr").actualLocale).toBe("fr");
    expect(getCityPassCopy("ar").actualLocale).toBe("ar");
  });
});

