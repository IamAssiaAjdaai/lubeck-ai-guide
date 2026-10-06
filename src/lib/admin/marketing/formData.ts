import {
  MarketingValidationError,
  validateMarketingCampaignInput,
  validateMarketingContentInput,
  validateMarketingPageInput,
  type MarketingCampaignInput,
  type MarketingContentInput,
  type MarketingPageInput,
} from "@/lib/admin/marketing/validation";

export function marketingCampaignInputFromFormData(
  formData: FormData,
): MarketingCampaignInput {
  return validateMarketingCampaignInput({
    cityId: numberField(formData, "cityId"),
    slug: field(formData, "slug"),
    name: field(formData, "name"),
    objective: field(formData, "objective"),
    audience: field(formData, "audience"),
    message: field(formData, "message"),
    cta: field(formData, "cta"),
    startsOn: optionalField(formData, "startsOn"),
    endsOn: optionalField(formData, "endsOn"),
  });
}

export function marketingPageInputFromFormData(
  formData: FormData,
): MarketingPageInput {
  const kind = field(formData, "kind");
  return validateMarketingPageInput({
    cityId: numberField(formData, "cityId"),
    campaignId: optionalNumberField(formData, "campaignId"),
    kind: kind as MarketingPageInput["kind"],
    slug: field(formData, "slug"),
    path: field(formData, "path"),
    title: field(formData, "title"),
    body: field(formData, "body"),
    seoTitle: optionalField(formData, "seoTitle"),
    seoDescription: optionalField(formData, "seoDescription"),
    cta: optionalField(formData, "cta"),
  });
}

export function marketingContentInputFromFormData(
  formData: FormData,
): MarketingContentInput {
  return validateMarketingContentInput({
    cityId: numberField(formData, "cityId"),
    campaignId: optionalNumberField(formData, "campaignId"),
    pageId: optionalNumberField(formData, "pageId"),
    contentCode: field(formData, "contentCode"),
    platform: field(formData, "platform"),
    format: field(formData, "format"),
    hook: field(formData, "hook"),
    script: optionalField(formData, "script"),
    caption: optionalField(formData, "caption"),
    cta: optionalField(formData, "cta"),
  });
}

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  if (typeof value !== "string") {
    throw new MarketingValidationError([`${name} is required.`]);
  }
  return value;
}

function optionalField(formData: FormData, name: string): string | undefined {
  return field(formData, name).trim() || undefined;
}

function numberField(formData: FormData, name: string): number {
  const value = Number(field(formData, name));
  if (!Number.isFinite(value)) {
    throw new MarketingValidationError([`${name} is invalid.`]);
  }
  return value;
}

function optionalNumberField(
  formData: FormData,
  name: string,
): number | undefined {
  const raw = field(formData, name).trim();
  if (!raw) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new MarketingValidationError([`${name} is invalid.`]);
  }
  return value;
}
