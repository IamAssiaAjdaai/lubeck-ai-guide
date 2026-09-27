import { describe, expect, it } from "vitest";
import { arabicTextOverride, nativeContentTextStyle, nativeHeadingStyle, nativeRowStyle, nativeTextBlock, nativeTextStyle } from "../src/design/rtlPresentation";
import { nativeArabicDisplayText, nativeCategoryLabel } from "../src/lib/contentLabels";

describe("centralized native Arabic composition", () => {
  it("gives Arabic blocks full alignment without double reversing rows or artwork", () => {
    expect(nativeTextStyle("rtl")).toEqual({ writingDirection: "rtl", textAlign: "right" });
    expect(nativeHeadingStyle("rtl")).toMatchObject({ alignSelf: "stretch", textAlign: "right" });
    expect(nativeTextBlock("rtl")).toEqual({ direction: "rtl", alignSelf: "stretch", alignItems: "stretch" });
    expect(nativeRowStyle("rtl")).toEqual({ direction: "rtl", flexDirection: "row" });
    expect(nativeRowStyle("ltr")).toEqual({ direction: "ltr", flexDirection: "row" });
  });
  it("keeps Arabic prose RTL despite legacy LTR styles, and retains real English fallback direction", () => {
    expect({ writingDirection: "ltr", ...arabicTextOverride("rtl", "القصة") }).toEqual({ writingDirection: "rtl", textAlign: "right" });
    expect(nativeContentTextStyle("ar", "en")).toEqual({ writingDirection: "ltr", textAlign: "right" });
    expect(arabicTextOverride("rtl", "Historic gate")).toEqual({ textAlign: "right" });
    expect(arabicTextOverride("ltr", "Historic gate")).toBeUndefined();
  });
  it("localizes known embedded city names only in Arabic display prose", () => {
    expect(nativeArabicDisplayText("المركز التاريخي لمدينة Lübeck", "ar")).toBe("المركز التاريخي لمدينة لوبيك");
    expect(nativeArabicDisplayText("زيارة Hamburg ثم Düsseldorf مع CITYWALK", "ar")).toBe("زيارة هامبورغ ثم دوسلدورف مع CITYWALK");
    expect(nativeArabicDisplayText("Lübeck Old Town", "ar")).toBe("Lübeck Old Town"); // genuinely untranslated prose is not fabricated
    expect(nativeArabicDisplayText("Lübeck", "de")).toBe("Lübeck");
  });
  it.each([ ["architecture", "العمارة"], ["history", "التاريخ"], ["food", "الطعام"], ["culture", "الثقافة"], ["nature", "الطبيعة"], ["entertainment", "الترفيه"] ])("localizes the %s taxonomy key without changing it", (key, label) => {
    expect(nativeCategoryLabel(key, "ar")).toBe(label);
  });
  it("retains shared translations and preserves unknown tags", () => {
    expect(nativeCategoryLabel("see", "ar")).toBe("معالم");
    expect(nativeCategoryLabel("eat", "ar")).toBe("مطاعم");
    expect(nativeCategoryLabel("fun", "ar")).toBe("ترفيه");
    expect(nativeCategoryLabel("waterfront", "ar")).toBe("الواجهة المائية");
    expect(nativeCategoryLabel("new-editorial-tag", "ar")).toBe("new editorial tag");
    expect(nativeCategoryLabel("architecture", "en")).toBe("Architecture");
  });
});
