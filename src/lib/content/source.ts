export const CONTENT_SOURCES = ["auto", "database", "code"] as const;
export type ContentSource = (typeof CONTENT_SOURCES)[number];

export function getContentSource(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): ContentSource {
  const value = environment.CITYWALK_CONTENT_SOURCE?.trim() || (environment.NODE_ENV === "production" ? "database" : "code");
  if (!CONTENT_SOURCES.includes(value as ContentSource)) {
    throw new Error(
      "CITYWALK_CONTENT_SOURCE must be auto, database, or code.",
    );
  }
  assertContentSourceAllowed(value as ContentSource, environment);
  return value as ContentSource;
}

export function assertContentSourceAllowed(source: ContentSource, environment: Readonly<Record<string, string | undefined>> = process.env) {
  if (source === "auto" && environment.NODE_ENV === "production") {
    throw new Error("CITYWALK_CONTENT_SOURCE=auto is development-only. Use database, or explicitly select curated code content.");
  }
}
