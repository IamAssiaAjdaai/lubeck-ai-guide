import { getLocaleDirection, isRTL } from "@citywalk/i18n";
import type { TextStyle, ViewStyle } from "react-native";
import type { NativeDirection } from "../lib/localization";

// Yoga direction owns row ordering. Never combine these with row-reverse or
// image transforms; brand artwork, photos and maps keep their original pixels.
const rtlText: TextStyle = { writingDirection: "rtl", textAlign: "right" };
const ltrText: TextStyle = { writingDirection: "ltr", textAlign: "left" };
const rtlBlock: ViewStyle = { direction: "rtl", alignSelf: "stretch", alignItems: "stretch" };
const ltrBlock: ViewStyle = { direction: "ltr" };
export function nativeTextStyle(direction: NativeDirection): TextStyle {
  return direction === "rtl" ? rtlText : ltrText;
}
export function nativeTextBlock(direction: NativeDirection): ViewStyle {
  return direction === "rtl" ? rtlBlock : ltrBlock;
}
export function nativeRowStyle(direction: NativeDirection): ViewStyle {
  return { direction, flexDirection: "row" };
}
export function nativeContentTextStyle(locale: string, sourceLocale: string): TextStyle {
  return { writingDirection: getLocaleDirection(sourceLocale), textAlign: isRTL(locale) ? "right" : "left" };
}
// Arabic text must win over legacy source-language styles. Real non-Arabic
// fallback prose retains its source writing direction while aligning right.
export function arabicTextOverride(direction: NativeDirection, text: string): TextStyle | undefined {
  return direction === "rtl" ? /\p{Script=Arabic}/u.test(text) ? rtlText : { textAlign: "right" } : undefined;
}

export function nativeHeadingStyle(direction: NativeDirection): TextStyle | undefined {
  return direction === "rtl" ? { ...rtlText, alignSelf: "stretch" } : undefined;
}
