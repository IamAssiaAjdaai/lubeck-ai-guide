import type { PublicMediaAttribution } from "./api/contracts";

export type MediaAttributionSegment = Readonly<{
  label: string;
  url?: string;
}>;

const ATTRIBUTION_SEPARATOR = /\s*(?:·|Â·|\||\r?\n)\s*/u;
const PUBLIC_URL_PATTERN = /https?:\/\/[^\s·|]+/giu;

export function formatMediaAttribution(
  attribution: PublicMediaAttribution,
): readonly MediaAttributionSegment[] {
  const segments: MediaAttributionSegment[] = [];

  for (const part of attribution.text.split(ATTRIBUTION_SEPARATOR)) {
    const value = part.trim();
    if (!value) continue;

    const urls = Array.from(value.matchAll(PUBLIC_URL_PATTERN), (match) =>
      normalizePublicUrl(match[0]),
    ).filter((url): url is string => Boolean(url));
    const label = cleanAttributionLabel(
      value.replace(PUBLIC_URL_PATTERN, ""),
    );

    if (label) {
      segments.push({ label, ...(urls[0] ? { url: urls[0] } : {}) });
      for (const url of urls.slice(1)) appendUrlSegment(segments, url);
      continue;
    }

    for (const url of urls) appendUrlSegment(segments, url);
  }

  const creator = attribution.creator?.trim();
  if (creator && !segments.some(({ label }) => includesIgnoreCase(label, creator))) {
    segments.unshift({ label: `Photo: ${creator}` });
  }

  return deduplicateSegments(segments);
}

function appendUrlSegment(segments: MediaAttributionSegment[], url: string): void {
  const label = getPublicUrlLabel(url);
  const previous = segments.at(-1);

  if (previous && !previous.url && labelsDescribeSameCredit(previous.label, label)) {
    segments[segments.length - 1] = { ...previous, url };
    return;
  }

  segments.push({ label, url });
}

function normalizePublicUrl(value: string): string | undefined {
  let candidate = value.replace(/[.,;:]+$/u, "");
  while (candidate.endsWith(")") && !candidate.includes("(")) {
    candidate = candidate.slice(0, -1);
  }

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function cleanAttributionLabel(value: string): string {
  return value
    .replace(/\(\s*\)/gu, "")
    .replace(/^[\s,;:–—-]+|[\s,;:–—-]+$/gu, "")
    .replace(/\s{2,}/gu, " ")
    .trim();
}

function getPublicUrlLabel(value: string): string {
  const url = new URL(value);
  const hostname = url.hostname.toLowerCase().replace(/^www\./u, "");

  if (hostname === "commons.wikimedia.org") return "Wikimedia Commons";

  if (hostname === "creativecommons.org") {
    const license = url.pathname.match(/\/licenses\/([^/]+)\/([^/]+)/u);
    if (license) return `CC ${license[1].toUpperCase()} ${license[2]}`;
    return "Creative Commons";
  }

  return hostname;
}

function labelsDescribeSameCredit(left: string, right: string): boolean {
  const normalizedLeft = left.trim().toLowerCase();
  const normalizedRight = right.trim().toLowerCase();
  if (normalizedLeft === normalizedRight) return true;
  return normalizedLeft.startsWith("cc ") && normalizedRight.startsWith("cc ");
}

function includesIgnoreCase(value: string, expected: string): boolean {
  return value.toLocaleLowerCase().includes(expected.toLocaleLowerCase());
}

function deduplicateSegments(
  segments: readonly MediaAttributionSegment[],
): readonly MediaAttributionSegment[] {
  return segments.filter(
    (segment, index) =>
      !segments.slice(0, index).some(
        (candidate) =>
          candidate.label.toLocaleLowerCase() === segment.label.toLocaleLowerCase() &&
          candidate.url === segment.url,
      ),
  );
}
