export class MarketingValidationError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(issues.join(" "));
    this.name = "MarketingValidationError";
  }
}

export type MarketingCampaignInput = Readonly<{
  cityId: number;
  slug: string;
  name: string;
  objective: string;
  audience: string;
  message: string;
  cta: string;
  startsOn?: string;
  endsOn?: string;
}>;

export type MarketingPageInput = Readonly<{
  cityId: number;
  campaignId?: number;
  kind: "landing" | "blog";
  slug: string;
  path: string;
  title: string;
  body: string;
  seoTitle?: string;
  seoDescription?: string;
  cta?: string;
}>;

export type MarketingContentInput = Readonly<{
  cityId: number;
  campaignId?: number;
  pageId?: number;
  contentCode: string;
  platform: string;
  format: string;
  hook: string;
  script?: string;
  caption?: string;
  cta?: string;
}>;

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const contentCodePattern = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

export function validateMarketingCampaignInput(
  input: MarketingCampaignInput,
): MarketingCampaignInput {
  const value = normalized(input);
  const issues: string[] = [];
  validateCityId(value.cityId, issues);
  validateRequired("Slug", value.slug, issues);
  if (value.slug && !slugPattern.test(value.slug)) {
    issues.push("Campaign slug must use lowercase letters, numbers and hyphens only.");
  }
  validateRequired("Name", value.name, issues);
  validateRequired("Objective", value.objective, issues);
  validateRequired("Audience", value.audience, issues);
  validateRequired("Message", value.message, issues);
  validateRequired("CTA", value.cta, issues);
  validateDate("Start date", value.startsOn, issues);
  validateDate("End date", value.endsOn, issues);
  if (value.startsOn && value.endsOn && value.startsOn > value.endsOn) {
    issues.push("Campaign end date cannot be before its start date.");
  }
  throwIfIssues(issues);
  return value;
}

export function validateMarketingPageInput(
  input: MarketingPageInput,
): MarketingPageInput {
  const value = normalized(input);
  const issues: string[] = [];
  validateCityId(value.cityId, issues);
  validateOptionalPositiveId("Campaign", value.campaignId, issues);
  if (value.kind !== "landing" && value.kind !== "blog") {
    issues.push("Page kind must be landing or blog.");
  }
  validateRequired("Slug", value.slug, issues);
  if (value.slug && !slugPattern.test(value.slug)) {
    issues.push("Page slug must use lowercase letters, numbers and hyphens only.");
  }
  validateRequired("Path", value.path, issues);
  if (value.path && (!value.path.startsWith("/") || value.path.includes(" "))) {
    issues.push("Page path must start with / and cannot contain spaces.");
  }
  validateRequired("Title", value.title, issues);
  validateRequired("Body", value.body, issues);
  throwIfIssues(issues);
  return value;
}

export function validateMarketingContentInput(
  input: MarketingContentInput,
): MarketingContentInput {
  const value = normalized(input);
  const issues: string[] = [];
  validateCityId(value.cityId, issues);
  validateOptionalPositiveId("Campaign", value.campaignId, issues);
  validateOptionalPositiveId("Page", value.pageId, issues);
  validateRequired("Content code", value.contentCode, issues);
  if (value.contentCode && !contentCodePattern.test(value.contentCode)) {
    issues.push("Content code must use uppercase letters, numbers and hyphens only.");
  }
  validateRequired("Platform", value.platform, issues);
  validateRequired("Format", value.format, issues);
  validateRequired("Hook", value.hook, issues);
  throwIfIssues(issues);
  return value;
}

function normalized<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      typeof value === "string" ? value.trim() : value,
    ]),
  ) as T;
}

function validateRequired(label: string, value: string, issues: string[]) {
  if (!value) issues.push(`${label} is required.`);
}

function validateCityId(cityId: number, issues: string[]) {
  if (!Number.isInteger(cityId) || cityId <= 0) {
    issues.push("City is required.");
  }
}

function validateOptionalPositiveId(
  label: string,
  value: number | undefined,
  issues: string[],
) {
  if (value !== undefined && (!Number.isInteger(value) || value <= 0)) {
    issues.push(`${label} is invalid.`);
  }
}

function validateDate(label: string, value: string | undefined, issues: string[]) {
  if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    issues.push(`${label} is invalid.`);
  }
}

function throwIfIssues(issues: string[]) {
  if (issues.length > 0) throw new MarketingValidationError(issues);
}
