export type MarketingAutomationPublishedDecision =
  | Readonly<{ action: "already_published"; publishedUrl: string }>
  | Readonly<{ action: "transition"; publishedUrl: string }>
  | Readonly<{
      action: "reject";
      code:
        | "INVALID_STATE"
        | "INVALID_PUBLISHED_URL"
        | "PUBLISHED_URL_MISMATCH";
    }>;

export function decideMarketingAutomationPublished(input: Readonly<{
  status: string;
  requestedPublishedUrl: unknown;
  currentPublishedUrl?: string | null;
}>): MarketingAutomationPublishedDecision {
  const requestedPublishedUrl = normalizeHttpUrl(input.requestedPublishedUrl);

  if (!requestedPublishedUrl) {
    return { action: "reject", code: "INVALID_PUBLISHED_URL" };
  }

  if (input.status === "published") {
    const currentPublishedUrl = normalizeHttpUrl(input.currentPublishedUrl);

    if (currentPublishedUrl === requestedPublishedUrl) {
      return {
        action: "already_published",
        publishedUrl: requestedPublishedUrl,
      };
    }

    return { action: "reject", code: "PUBLISHED_URL_MISMATCH" };
  }

  if (input.status !== "ready") {
    return { action: "reject", code: "INVALID_STATE" };
  }

  return {
    action: "transition",
    publishedUrl: requestedPublishedUrl,
  };
}

function normalizeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;

  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  return parsed.toString();
}
