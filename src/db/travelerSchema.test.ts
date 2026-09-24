import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  travelerGuestLinks,
  travelerProfiles,
} from "@/db/travelerSchema";

describe("traveler account database schema", () => {
  it("keeps one traveler profile per auth user and cascades on account deletion", () => {
    const profileConfig = getTableConfig(travelerProfiles);

    expect(profileConfig.name).toBe("traveler_profiles");
    expect(profileConfig.foreignKeys).toHaveLength(1);
    expect(profileConfig.foreignKeys[0]?.onDelete).toBe("cascade");
    expect(profileConfig.columns.find((column) => column.name === "preferred_locale")?.notNull).toBe(true);
  });

  it("links one anonymous visitor identity to at most one traveler account", () => {
    const linkConfig = getTableConfig(travelerGuestLinks);

    expect(linkConfig.name).toBe("traveler_guest_links");
    expect(
      linkConfig.indexes.some(
        (index) =>
          index.config.name === "traveler_guest_links_visitor_id_unique" &&
          index.config.unique,
      ),
    ).toBe(true);
    expect(linkConfig.foreignKeys).toHaveLength(1);
    expect(linkConfig.foreignKeys[0]?.onDelete).toBe("cascade");
    expect(linkConfig.columns.map((column) => column.name)).not.toContain("latitude");
    expect(linkConfig.columns.map((column) => column.name)).not.toContain("longitude");
  });
});
