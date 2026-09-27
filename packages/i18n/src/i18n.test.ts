import { describe, expect, it, vi } from "vitest";
import { createTranslator, dictionaries, formatMessage, t } from "./translator";
import { getLocaleDirection, getLocaleLabel, isRTL, isSharedLocale, sharedLocales } from "./locale-config";
import { reportContentFallback, resolveLocalizedContent } from "./content";
import { nativeCopy, walkCopy, webCopy, uxCopy } from "./adapters";
import type { MessageTree } from "./types";
function leaves(tree: MessageTree, prefix = ""): Record<string, string> {
  return Object.fromEntries(Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? [[path, value]] : Object.entries(leaves(value, path));
  }));
}
describe("shared UI translations", () => {
  it.each([
    ["en", "Add to my walk"], ["de", "Zu meinem Spaziergang hinzufügen"], ["ar", "أضف إلى جولتي"],
  ])("looks up a semantic key in %s", (locale, expected) => { expect(t(locale, "walk.add")).toBe(expected); });
  it("falls back to English for an unsupported UI locale", () => { expect(t("missing", "walk.add")).toBe("Add to my walk"); });
  it("falls back for a missing or empty translation and warns once in development", () => {
    const warn = vi.fn();
    const translate = createTranslator({ development: true, warn, dictionaries: { en: { walk: { add: "Add", remove: "Remove" } }, ar: { walk: { remove: "" } } } });
    expect(translate("ar", "walk.add")).toBe("Add");
    expect(translate("ar", "walk.add")).toBe("Add");
    expect(translate("ar", "walk.remove")).toBe("Remove");
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledWith("[i18n] Missing translation: locale=ar key=walk.add");
  });
  it("returns an unknown key safely without warning in production", () => {
    const warn = vi.fn(); const translate = createTranslator({ development: false, warn });
    // @ts-expect-error Runtime protection for stale clients; callers cannot type an unknown key.
    expect(translate("ar", "removed.key")).toBe("removed.key");
    expect(warn).not.toHaveBeenCalled();
  });
  it("interpolates without recursively interpreting replacement values", () => {
    expect(t("en", "planner.step", { step: 2 })).toBe("Step 2 of 3");
    expect(formatMessage("{city} / {count}", { city: "{count}", count: 2 })).toBe("{count} / 2");
    expect(formatMessage("{unknown}", {})).toBe("{unknown}");
  });
  it.each(sharedLocales)("has every English key, nonempty value and matching placeholders in %s", locale => {
    const english = leaves(dictionaries.en), translated = leaves(dictionaries[locale]);
    expect(Object.keys(translated).sort()).toEqual(Object.keys(english).sort());
    const placeholders = (text: string) => [...text.matchAll(/\{([^{}]+)\}/g)].map(match => match[1]).sort();
    for (const [key, value] of Object.entries(translated)) {
      expect(value.trim(), `${locale}:${key}`).not.toBe("");
      expect(placeholders(value), `${locale}:${key}`).toEqual(placeholders(english[key]));
    }
    for (const section of ["navigation", "home", "cityHub", "explore", "place", "planner", "walk", "saved", "trips", "profile", "assistant", "loading", "errors", "emptyStates", "common"]) {
      expect(dictionaries[locale]).toHaveProperty(section);
    }
  });
  it.each(sharedLocales)("uses the same keys through Web and Native compatibility views in %s", locale => {
    expect(webCopy(locale).home.title).toBe(walkCopy(locale).homeTitle);
    expect(walkCopy(locale).homeTitle).toBe(t(locale, "home.title"));
    expect(uxCopy(locale).add).toBe(walkCopy(locale).addToWalk);
    expect(nativeCopy(locale).askCitywalk).toBe(t(locale, "assistant.ask"));
    expect(nativeCopy(locale).guideThinking).toBe(t(locale, "assistant.thinking"));
  });
  it("keeps city/place/editorial content out of the UI catalog", () => {
    for (const locale of sharedLocales) {
      expect(JSON.stringify(dictionaries[locale])).not.toMatch(/Lübeck|Hamburg|Düsseldorf|Holstentor|لوبيك|هولستنتور/);
    }
  });
});
describe("locale configuration", () => {
  it.each([["en", "ltr", "English"], ["de", "ltr", "Deutsch"], ["ar", "rtl", "العربية"]])("defines direction and label for %s", (locale, direction, label) => {
    expect(getLocaleDirection(locale)).toBe(direction);
    expect(isRTL(locale)).toBe(direction === "rtl");
    expect(getLocaleLabel(locale)).toBe(label);
    expect(isSharedLocale(locale)).toBe(true);
  });
  it("does not accept inherited properties as locales", () => {
    expect(isSharedLocale("toString")).toBe(false);
    expect(getLocaleDirection("unknown")).toBe("ltr");
  });
});
describe("dynamic content remains separate from UI", () => {
  const record = { identity: "place:holstentor", translations: { ar: { name: "بوابة هولشتن" }, en: { name: "Holsten Gate" } }, canonical: { locale: "de", content: { name: "Holstentor" } } };
  it("prefers authored Arabic without changing record identity or content", () => {
    const warn = vi.fn();
    expect(resolveLocalizedContent(record, "ar", { development: true, warn })).toEqual({ requestedLocale: "ar", resolvedLocale: "ar", didFallback: false, content: record.translations.ar });
    expect(warn).not.toHaveBeenCalled();
  });
  it("uses English fallback with explicit locale metadata and a development warning", () => {
    const warn = vi.fn();
    expect(resolveLocalizedContent({ ...record, translations: { en: record.translations.en } }, "ar", { development: true, warn })).toEqual({ requestedLocale: "ar", resolvedLocale: "en", didFallback: true, content: record.translations.en });
    expect(warn).toHaveBeenCalledWith("[i18n-content] Missing translation: record=place:holstentor locale=ar");
  });
  it("uses canonical content only when requested and English translations are absent", () => {
    expect(resolveLocalizedContent({ ...record, translations: {} }, "ar")).toMatchObject({ resolvedLocale: "de", content: record.canonical.content, didFallback: true });
  });
  it("returns undefined for an empty record rather than inventing editorial content", () => { expect(resolveLocalizedContent({ translations: {} }, "ar")).toBeUndefined(); });
  it("reports a resolved public DTO fallback without changing its content", () => {
    const warn = vi.fn(), dto = { requestedLocale: "ar", resolvedLocale: "en", didFallback: true, content: { name: "English" } };
    reportContentFallback(dto, "place:missing", { development: true, warn });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("record=place:missing locale=ar resolved=en"));
    expect(dto.content.name).toBe("English");
    warn.mockClear(); reportContentFallback(dto, "place:missing", { development: false, warn });
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("official launch-language completeness", () => {
  it("registers the six official locales without dropping experimental Arabic", async () => {
    const { launchLocales, getSelectableLocales } = await import("./locale-config");
    expect(launchLocales).toEqual(["de", "en", "da", "sv", "nl", "es"]);
    expect(getSelectableLocales()).toEqual(launchLocales);
    expect(getSelectableLocales(true)).toEqual([...launchLocales, "ar"]);
    expect(isRTL("ar")).toBe(true);
  });
  it.each([
    ["de", "Deutsch"], ["en", "English"], ["da", "Dansk"],
    ["sv", "Svenska"], ["nl", "Nederlands"], ["es", "Español"],
  ])("has complete direct UI lookup, LTR layout and correct label for %s", (locale, label) => {
    expect(isSharedLocale(locale)).toBe(true);
    if (!isSharedLocale(locale)) throw new Error("Launch locale is not registered");
    expect(getLocaleLabel(locale)).toBe(label);
    expect(getLocaleDirection(locale)).toBe("ltr");
    const warn = vi.fn(), translate = createTranslator({ development: true, warn });
    const entries = leaves(dictionaries[locale]);
    expect(Object.keys(entries)).toHaveLength(Object.keys(leaves(dictionaries.en)).length);
    for (const key of Object.keys(leaves(dictionaries.en))) {
      expect(entries[key]?.trim(), `${locale}:${key}`).toBeTruthy();
      expect(translate(locale, key as import("./types").TranslationKey)).toBe(entries[key]);
    }
    for (const key of ["review.title", "review.description", "review.action", "walk.add", "walk.adding", "walk.inWalk", "walk.remove", "loading.buildingWalk", "loading.matchingInterests", "loading.checkingWalkingTime", "loading.adaptingRoute", "loading.choosingStops"]) {
      expect(entries[key]).toBeTruthy();
    }
    expect(warn).not.toHaveBeenCalled();
    expect(entries["review.description"]).not.toMatch(/5.?star|5.?stjern|5.?stjärn|5.?ster|5.?estrell/i);
  });
});
