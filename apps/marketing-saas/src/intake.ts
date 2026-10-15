import { z } from "zod";
import { rawBusinessBriefSchema, type RawBusinessBrief } from "@marketing/core";

/**
 * Owner-entered values only. There is no scraper, identity verification,
 * AI-generated claim, server persistence or publication permission here.
 */
export const projectKinds = ["website", "app", "local"] as const;
export type ProjectKind = (typeof projectKinds)[number];

export const projectIntakeSchema = z.strictObject({
  kind: z.enum(projectKinds),
  name: z.string().trim().min(2, "Enter at least 2 characters.").max(160),
  websiteUrl: z.string().trim().max(2048),
  city: z.string().trim().max(160),
  goal: z.string().trim().min(3, "Describe one goal.").max(1000),
  description: z.string().trim().min(10, "Describe what you offer (at least 10 characters).").max(2000),
  monthlyBudget: z.string().trim().regex(/^(?:[0-9]{1,6})?$/, "Use a whole number or leave empty."),
  ownerClaim: z.string().trim().max(2000),
}).superRefine((value, ctx) => {
  if (value.kind === "local" && !value.city) {
    ctx.addIssue({ code: "custom", path: ["city"], message: "Enter the city your business serves." });
  }
  if (value.kind !== "local") {
    if (!value.websiteUrl) {
      ctx.addIssue({ code: "custom", path: ["websiteUrl"], message: "Enter your website or app URL." });
    } else {
      try {
        const url = new URL(value.websiteUrl);
        if (url.protocol !== "https:" || !url.hostname || url.username || url.password) {
          throw new Error("Invalid public URL");
        }
      } catch {
        ctx.addIssue({ code: "custom", path: ["websiteUrl"], message: "Use a complete HTTPS URL without login details." });
      }
    }
  }
});

export type ProjectIntake = z.input<typeof projectIntakeSchema>;
export type ProjectIntakeField = keyof ProjectIntake;

export const blankIntake: ProjectIntake = {
  kind: "website",
  name: "",
  websiteUrl: "",
  city: "",
  goal: "",
  description: "",
  monthlyBudget: "",
  ownerClaim: "",
};

export type IntakeValidation =
  | { ok: true; value: ProjectIntake; brief: RawBusinessBrief }
  | { ok: false; errors: Partial<Record<ProjectIntakeField, string>> };

export function validateProjectIntake(input: ProjectIntake): IntakeValidation {
  const parsed = projectIntakeSchema.safeParse(input);
  if (!parsed.success) {
    const errors: Partial<Record<ProjectIntakeField, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as ProjectIntakeField | undefined;
      if (field && !errors[field]) errors[field] = issue.message;
    }
    return { ok: false, errors };
  }

  const value = parsed.data;
  // These are declared values, NOT independently observed source evidence.
  // Only explicit owner-typed claims become unconfirmed fact proposals.
  const raw = {
    rawText: [
      `Project type: ${value.kind}`,
      `Business name (owner declared): ${value.name}`,
      `Description (owner declared): ${value.description}`,
      `Marketing goal (owner declared): ${value.goal}`,
      value.kind === "local" ? `Service city: ${value.city}` : `Submitted URL (not fetched): ${value.websiteUrl}`,
      value.monthlyBudget ? `Monthly budget in EUR (owner declared): ${value.monthlyBudget}` : "",
    ].filter(Boolean).join("\n"),
    identity: {
      name: value.name,
      summary: value.description,
      businessType: value.kind === "local" ? "Local business" : value.kind === "website" ? "Website business" : "App business",
      ...(value.kind !== "local" ? { website: value.websiteUrl } : {}),
    },
    marketingGoals: [{ id: "owner-goal", description: value.goal }],
    markets: value.kind === "local" ? [{ id: "owner-city", name: value.city }] : [],
    facts: value.ownerClaim ? [{
      id: "owner-claim",
      statement: value.ownerClaim,
      basis: "user_supplied" as const,
      provenanceIds: [],
    }] : [],
  };
  const core = rawBusinessBriefSchema.safeParse(raw);
  if (!core.success) {
    // The generic marketing-core is authoritative after UI validation.
    // Never log customer text, raw claims, or structured schema errors.
    return { ok: false, errors: { description: "Please review the entered information before continuing." } };
  }
  return { ok: true, value, brief: core.data };
}
