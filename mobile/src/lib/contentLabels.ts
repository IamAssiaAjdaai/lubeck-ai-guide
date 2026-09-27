import { categoryLabel } from "@citywalk/i18n";
export const nativeCategoryLabel = categoryLabel;

// Correct known display-name fragments only inside Arabic prose. Do not
// machine-translate missing summaries or rewrite genuine English fallback.
export function nativeArabicDisplayText(text: string, locale: string): string {
  if (locale !== "ar" || !/\p{Script=Arabic}/u.test(text)) return text;
  return text.replace(/\b(?:Lübeck|Luebeck|Lubeck)\b/gu, "لوبيك")
    .replace(/\bHamburg\b/gu, "هامبورغ")
    .replace(/\b(?:Düsseldorf|Duesseldorf)\b/gu, "دوسلدورف");
}
