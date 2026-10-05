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
  const issues: string[] = [];
  validateCityId(input.cityId, issues);
  validateRequired("Slug", input.slug, issues);
  if (input.slug && !slugPattern.test(input.slug)) {
    issues.push("Campaign slug must use lowercase letters, numbers and hyphens only.");
  }
  validateRequired("Name", input.name, issues);
  validateRequired("Objective", input.objective, issues);
  validateRequired("Audience", input.audience, issues);
  validateRequired("Message", input.message, issues);
  validateRequired("CTA", input.cta, issues);
  validateDate("Start date", input.startsOn, issues);
  validateDate("End date", input.endsOn, issues);
  if (input.startsOn && input.endsOn && input.startsOn > input.endsOn) {
    issues.push("Campaign end date cannot be before its start date.");
  }
  throwIfIssues(issues);
  return normalized(input);
}

export function validateMarketingPageInput(
  input: MarketingPageInput,
): MarketingPageInput {
  const issues: string[] = [];
  validateCityId(input.cityId, issues);
  validateOptionalPositiveId("Campaign", input.campaignId, issues);
  if (input.kind !== "landing" && input.kind !== "blog") {
    issues.push("Page kind must be landing or blog.");
  }
  validateRequired("Slug", input.slug, issues);
  if (input.slug && !slugPattern.test(input.slug)) {
    issues.push("Page slug must use lowercase letters, numbers and hyphens only.");
  }
  validateRequired("Path", input.path, issues);
  if (input.path && (!input.path.startsWith("/") || input.path.includes(" "))) {
    issues.push("Page path must start with / and cannot contain spaces.");
  }
  validateRequired("Title", input.title, issues);
  validateRequired("Body", input.body, issues);
  throwIfIssues(issues);
  return normalized(input);
}

export function validateMarketingContentInput(
  input: MarketingContentInput,
): MarketingContentInput {
  const issues: string[] = [];
  validateCityId(input.cityId, issues);
  validateOptionalPositiveId("Campaign", input.campaignId, issues);
  validateOptionalPositiveId("Page", input.pageId, issues);
  validateRequired("Content code", input.contentCode, issues);
  if (input.contentCode && !contentCodePattern.test(input.contentCode)) {
    issues.push("Content code must use uppercase letters, numbers and hyphens only.");
  }
  validateRequired("Platform", input.platform, issues);
  validateRequired("Format", input.format, issues);
  validateRequired("Hook", input.hook, issues);
  throwIfIssues(issues);
  return normalized(input);
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
  if (!value.trim()) issues.push(`${label} is required.`);
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
