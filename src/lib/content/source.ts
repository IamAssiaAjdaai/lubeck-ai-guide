export const CONTENT_SOURCES = ["auto", "database", "code"] as const;
export type ContentSource = (typeof CONTENT_SOURCES)[number];

export function getContentSource(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): ContentSource {
  const value = environment.CITYWALK_CONTENT_SOURCE?.trim() || "code";
  if (!CONTENT_SOURCES.includes(value as ContentSource)) {
    throw new Error(
      "CITYWALK_CONTENT_SOURCE must be auto, database, or code.",
    );
  }
  return value as ContentSource;
}
