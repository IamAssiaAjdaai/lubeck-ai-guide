import type {
  MarketingContentRow,
  MarketingPageRow,
} from "@/db/marketingSchema";
import type { AiContentQaInput } from "@/lib/contentQa/aiReview";

/**
 * CITYWALK marketing is not itself a verified factual source.
 * This adapter intentionally supplies no verified facts, source IDs or
 * claims inferred from free text. The AI provider must fail closed until
 * an authoritative source package is linked server-side.
 */
export function buildMarketingPageQaInput(
  page: Pick<
    MarketingPageRow,
    "kind" | "title" | "body" | "cta" | "seoTitle" | "seoDescription"
  >,
): AiContentQaInput {
  return {
    contentType: page.kind === "blog" ? "marketing_blog" : "marketing_landing",
    requireEvidence: true,
    fields: [
      { key: "title", label: "Title", value: page.title, required: true, maxLength: 120 },
      { key: "body", label: "Body", value: page.body, required: true, maxLength: 6000 },
      { key: "cta", label: "CTA", value: page.cta, role: "cta", maxLength: 100 },
      { key: "seoTitle", label: "SEO title", value: page.seoTitle, maxLength: 70 },
      { key: "seoDescription", label: "SEO description", value: page.seoDescription, maxLength: 180 },
    ],
  };
}

export function buildMarketingSocialQaInput(
  content: Pick<
    MarketingContentRow,
    "platform" | "format" | "hook" | "script" | "caption" | "cta"
  >,
): AiContentQaInput {
  return {
    contentType: "marketing_social",
    requireEvidence: true,
    fields: [
      { key: "platform", label: "Platform", value: content.platform, required: true },
      { key: "format", label: "Format", value: content.format, required: true },
      { key: "hook", label: "Hook", value: content.hook, required: true, maxLength: 160 },
      { key: "script", label: "Script", value: content.script, maxLength: 2500 },
      { key: "caption", label: "Caption", value: content.caption, maxLength: 2200 },
      { key: "cta", label: "CTA", value: content.cta, role: "cta", maxLength: 100 },
    ],
  };
}
