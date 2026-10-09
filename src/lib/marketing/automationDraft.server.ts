import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { marketingContentTable } from "@/db/marketingSchema";
import { citiesTable } from "@/db/schema";
import { validateMarketingContentInput } from "@/lib/admin/marketing/validation";

export type AutomationMarketingDraftInput = {
  citySlug: string;
  contentCode: string;
  platform: string;
  format: string;
  hook: string;
  script?: string;
  caption?: string;
  cta?: string;
};

export async function createAutomationMarketingDraft(
  input: AutomationMarketingDraftInput,
) {
  const db = getDb();

  const [city] = await db
    .select({
      id: citiesTable.id,
      slug: citiesTable.slug,
    })
    .from(citiesTable)
    .where(eq(citiesTable.slug, input.citySlug.trim()))
    .limit(1);

  if (!city) {
    throw new Error(`City "${input.citySlug}" was not found.`);
  }

  // Important for automations:
  // if n8n retries the same request, do not create a duplicate.
  const [existing] = await db
    .select()
    .from(marketingContentTable)
    .where(eq(marketingContentTable.contentCode, input.contentCode.trim()))
    .limit(1);

  if (existing) {
    return {
      created: false,
      item: existing,
    };
  }

  const validated = validateMarketingContentInput({
    cityId: city.id,
    contentCode: input.contentCode,
    platform: input.platform,
    format: input.format,
    hook: input.hook,
    script: input.script,
    caption: input.caption,
    cta: input.cta,
  });

  const [created] = await db
    .insert(marketingContentTable)
    .values({
      cityId: validated.cityId,
      campaignId: null,
      pageId: null,
      contentCode: validated.contentCode,
      platform: validated.platform,
      format: validated.format,
      hook: validated.hook,
      script: validated.script ?? null,
      caption: validated.caption ?? null,
      cta: validated.cta ?? null,

      // Human must review this before publication.
      status: "draft",

      // This record was created by an automation, not an admin session.
      createdByUserId: null,
      updatedByUserId: null,
    })
    .returning();

  if (!created) {
    throw new Error("Marketing draft creation failed.");
  }

  return {
    created: true,
    item: created,
  };
}