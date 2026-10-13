// @vitest-environment node
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { brandContextAudit, brandContextRevisions, brandContexts, brandProjects } from "./brandContextSchema";

import { citywalkBrandProjects, citywalkBrandReviewers } from "./citywalkBrandContextSchema";

describe("brand context persistence schema", () => {
  it("keeps CITYWALK scope and identity out of generic tables", () => {
    for (const table of [brandProjects, brandContexts, brandContextRevisions, brandContextAudit]) {
      const c = getTableConfig(table);
      expect(c.columns.map(x => x.name)).not.toContain("city_id");
      expect(c.columns.map(x => x.name)).not.toContain("campaign_id");
      expect(c.foreignKeys.map(x => getTableConfig(x.reference().foreignTable).name)).not.toContain("user");
    }
  });
  it("encodes explicit project purge cascades, version bounds and no account erasure restriction", () => {
    expect(getTableConfig(brandContextRevisions).checks.map(c => c.name)).toContain("brand_revision_shape");
    expect(getTableConfig(brandContextAudit).primaryKeys).toHaveLength(1);
    expect(getTableConfig(citywalkBrandProjects).foreignKeys.every(f => f.onDelete === "cascade")).toBe(true);
    expect(getTableConfig(citywalkBrandReviewers).foreignKeys[0].onDelete).toBe("set null");
  });
});
