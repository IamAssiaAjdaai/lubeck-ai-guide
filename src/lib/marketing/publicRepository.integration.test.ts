// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";

vi.mock("server-only", () => ({}));

import { closeDb, getDb } from "@/db/client";
import {
  marketingCampaignsTable,
  marketingPagesTable,
} from "@/db/marketingSchema";
import { citiesTable } from "@/db/schema";
import { getPublishedMarketingPageByPath } from "@/lib/marketing/publicRepository.server";

const shouldRun = process.env.MARKETING_DB_INTEGRATION === "1";
const publishedCitySlug = "marketing-public-integration";
const draftCitySlug = "marketing-public-draft-city";

describe.runIf(shouldRun)("Marketing public repository PostgreSQL integration", () => {
  beforeAll(async () => {
    await cleanupCities();

    const db = getDb();
    const [publishedCity] = await db
      .insert(citiesTable)
      .values({
        slug: publishedCitySlug,
        name: "Marketing Public City",
        publicationStatus: "published",
      })
      .returning();
    const [draftCity] = await db
      .insert(citiesTable)
      .values({
        slug: draftCitySlug,
        name: "Marketing Draft City",
        publicationStatus: "draft",
      })
      .returning();

    if (!publishedCity || !draftCity) {
      throw new Error("Marketing public integration setup failed.");
    }

    const [campaign] = await db
      .insert(marketingCampaignsTable)
      .values({
        cityId: publishedCity.id,
        slug: "published-campaign",
        name: "Published Campaign",
        objective: "Integration coverage",
        audience: "Test audience",
        message: "Test message",
        cta: "Build my walk",
        status: "active",
      })
      .returning();

    if (!campaign) throw new Error("Marketing campaign setup failed.");

    await db.insert(marketingPagesTable).values([
      {
        cityId: publishedCity.id,
        campaignId: campaign.id,
        kind: "landing",
        slug: "published-page",
        path: "/marketing-public-integration/published-page",
        title: "Published page",
        body: "Public-safe body",
        seoTitle: "Published SEO title",
        seoDescription: "Published SEO description",
        cta: "Build my walk",
        publicationStatus: "published",
        publishedAt: new Date(),
        createdByUserId: "internal-actor",
        updatedByUserId: "internal-actor",
      },
      {
        cityId: publishedCity.id,
        kind: "landing",
        slug: "draft-page",
        path: "/marketing-public-integration/draft-page",
        title: "Draft page",
        body: "Must not be public",
        publicationStatus: "draft",
      },
      {
        cityId: draftCity.id,
        kind: "landing",
        slug: "published-page-draft-city",
        path: "/marketing-public-integration/draft-city",
        title: "Published page in draft city",
        body: "Must not be public",
        publicationStatus: "published",
        publishedAt: new Date(),
      },
    ]);
  });

  afterAll(async () => {
    await cleanupCities();
    await closeDb();
  });

  it("exposes only the public DTO for a published page in a published city", async () => {
    await expect(
      getPublishedMarketingPageByPath(
        "/marketing-public-integration/published-page",
      ),
    ).resolves.toEqual({
      id: expect.any(Number),
      kind: "landing",
      slug: "published-page",
      path: "/marketing-public-integration/published-page",
      title: "Published page",
      body: "Public-safe body",
      seoTitle: "Published SEO title",
      seoDescription: "Published SEO description",
      cta: "Build my walk",
      city: {
        slug: publishedCitySlug,
        name: "Marketing Public City",
      },
      campaign: {
        slug: "published-campaign",
      },
    });
  });

  it("hides draft pages and pages whose city is not published", async () => {
    await expect(
      getPublishedMarketingPageByPath(
        "/marketing-public-integration/draft-page",
      ),
    ).resolves.toBeUndefined();
    await expect(
      getPublishedMarketingPageByPath(
        "/marketing-public-integration/draft-city",
      ),
    ).resolves.toBeUndefined();
  });
});

async function cleanupCities() {
  const db = getDb();
  const cities = await db
    .select({ id: citiesTable.id })
    .from(citiesTable)
    .where(inArray(citiesTable.slug, [publishedCitySlug, draftCitySlug]));

  for (const city of cities) {
    await db.delete(citiesTable).where(eq(citiesTable.id, city.id));
  }
}
