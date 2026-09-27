import content from "./lubeckEditorial.json";
// Authored seed coverage is independent of supported UI locales. Registering a
// UI language must never import English fallback as an authored CMS translation.
export const lubeckEditorialLocales = Object.keys(content) as (keyof typeof content)[];
export function getLubeckEditorial(locale: string) {
  return content[locale as keyof typeof content] ?? content.en;
}
