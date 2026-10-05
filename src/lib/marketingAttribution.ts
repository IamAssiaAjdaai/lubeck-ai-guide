export type MarketingAttribution = Readonly<{
  source?: string;
  medium?: string;
  campaign?: string;
  contentId?: string;
}>;

export function buildMarketingTrackingPath({
  path,
  platform,
  campaignSlug,
  contentCode,
}: Readonly<{
  path: string;
  platform: string;
  campaignSlug?: string | null;
  contentCode: string;
}>): string {
  const [pathname, existingQuery = ""] = path.split("?", 2);
  const params = new URLSearchParams(existingQuery);
  params.set("utm_source", normalizeToken(platform));
  params.set("utm_medium", "social");
  params.set("utm_campaign", normalizeToken(campaignSlug || "citywalk"));
  params.set("utm_content", contentCode.trim());
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function readMarketingAttribution(
  searchParams: URLSearchParams | Readonly<Record<string, string | string[] | undefined>>,
): MarketingAttribution {
  return compactAttribution({
    source: readParam(searchParams, "utm_source"),
    medium: readParam(searchParams, "utm_medium"),
    campaign: readParam(searchParams, "utm_campaign"),
    contentId: readParam(searchParams, "utm_content"),
  });
}

export function appendMarketingAttributionToPath(
  path: string,
  attribution: MarketingAttribution,
): string {
  const [pathname, existingQuery = ""] = path.split("?", 2);
  const params = new URLSearchParams(existingQuery);

  const values = [
    ["utm_source", attribution.source],
    ["utm_medium", attribution.medium],
    ["utm_campaign", attribution.campaign],
    ["utm_content", attribution.contentId],
  ] as const;

  for (const [key, value] of values) {
    if (value) params.set(key, value);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function marketingAttributionPostHogProperties(
  attribution: MarketingAttribution,
): Readonly<Record<string, string>> {
  return Object.fromEntries(
    [
      ["source", attribution.source],
      ["medium", attribution.medium],
      ["campaign", attribution.campaign],
      ["content_id", attribution.contentId],
    ].filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
}

function readParam(
  searchParams: URLSearchParams | Readonly<Record<string, string | string[] | undefined>>,
  key: string,
): string | undefined {
  if (searchParams instanceof URLSearchParams) {
    return clean(searchParams.get(key));
  }
  const value = searchParams[key];
  return clean(Array.isArray(value) ? value[0] : value);
}

function compactAttribution(value: MarketingAttribution): MarketingAttribution {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => Boolean(item)),
  ) as MarketingAttribution;
}

function normalizeToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function clean(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}
