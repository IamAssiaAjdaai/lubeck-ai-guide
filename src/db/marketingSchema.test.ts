import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  marketingCampaignsTable,
  marketingCampaignStatusEnum,
  marketingContentStatusEnum,
  marketingContentTable,
  marketingPageKindEnum,
  marketingPagesTable,
} from "@/db/marketingSchema";

describe("marketing database schema", () => {
  it("uses explicit campaign, page and social lifecycles", () => {
    expect(marketingCampaignStatusEnum.enumValues).toEqual([
      "draft",
      "active",
      "paused",
      "completed",
      "archived",
    ]);
    expect(marketingPageKindEnum.enumValues).toEqual(["landing", "blog"]);
    expect(marketingContentStatusEnum.enumValues).toEqual([
      "idea",
      "draft",
      "in_review",
      "approved",
      "ready",
      "published",
      "archived",
    ]);
  });

  it("keeps campaigns city-scoped and unique by city/slug", () => {
    const config = getTableConfig(marketingCampaignsTable);

    expect(config.name).toBe("marketing_campaigns");
    expect(config.foreignKeys).toHaveLength(1);
    expect(
      config.indexes.some(
        (index) =>
          index.config.name === "marketing_campaigns_city_slug_unique" &&
          index.config.unique,
      ),
    ).toBe(true);
  });

  it("keeps page routes globally unique and social content codes stable", () => {
    const pageConfig = getTableConfig(marketingPagesTable);
    const contentConfig = getTableConfig(marketingContentTable);

    expect(
      pageConfig.indexes.some(
        (index) =>
          index.config.name === "marketing_pages_path_unique" &&
          index.config.unique,
      ),
    ).toBe(true);
    expect(
      contentConfig.columns.find((column) => column.name === "content_code")
        ?.isUnique,
    ).toBe(true);
    expect(pageConfig.foreignKeys).toHaveLength(2);
    expect(contentConfig.foreignKeys).toHaveLength(3);
  });
});
