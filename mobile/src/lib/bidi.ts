import type { NativeDirection } from "./localization";

// FSI/PDI isolates the name's own direction from surrounding Arabic punctuation
// and text. This is presentation only: never use the result in slugs or routes.
export function isolateBidiName(name: string, direction: NativeDirection): string {
  return direction === "rtl" ? `\u2068${name}\u2069` : name;
}

// Isolate Latin runs in Arabic prose (brand names, source titles, etc.) while
// preserving existing isolated names. This never changes stored/API strings.
export function isolateLatinRuns(text: string): string {
  return text.split(/(\u2068[^\u2069]*\u2069)/u).map(part =>
    part.startsWith("\u2068") ? part : part.replace(
      /\p{Script=Latin}[\p{Script=Latin}\p{Mark}\d]*(?:[ .’'&/:-]+[\p{Script=Latin}\d][\p{Script=Latin}\p{Mark}\d]*)*/gu,
      name => `\u2068${name}\u2069`,
    ),
  ).join("");
}
