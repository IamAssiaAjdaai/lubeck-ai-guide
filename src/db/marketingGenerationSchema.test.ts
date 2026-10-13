import { readFileSync } from "node:fs";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { databaseSchema } from "@/db/client";
import {
  marketingSourceSnapshotsTable, marketingGenerationJobsTable,
  marketingGenerationOutputsTable, marketingGenerationJobStatusEnum,
  marketingGenerationOutputStatusEnum,
} from "./marketingGenerationSchema";

describe("marketing generation database foundation", () => {
  it("registers all three tables with the shared database", () => {
    expect(databaseSchema.marketingSourceSnapshotsTable).toBe(marketingSourceSnapshotsTable);
    expect(databaseSchema.marketingGenerationJobsTable).toBe(marketingGenerationJobsTable);
    expect(databaseSchema.marketingGenerationOutputsTable).toBe(marketingGenerationOutputsTable);
  });
  it("defaults generation to queued work and unpublished drafts", () => {
    expect(marketingGenerationJobsTable.status.default).toBe("queued");
    expect(marketingGenerationOutputsTable.status.default).toBe("draft");
    expect(marketingGenerationJobStatusEnum.enumValues).toEqual(["queued", "claimed", "processing", "completed", "failed", "cancelled"]);
    expect(marketingGenerationOutputStatusEnum.enumValues).toEqual(["draft", "approved", "rejected"]);
  });
  it("enforces composite ownership and preserves traceability on deletion", () => {
    for (const table of [marketingSourceSnapshotsTable, marketingGenerationJobsTable, marketingGenerationOutputsTable]) {
      const config = getTableConfig(table);
      expect(config.foreignKeys.every((fk) => fk.onDelete === "restrict")).toBe(true);
      expect(config.foreignKeys.some((fk) => fk.reference().columns.length > 1)).toBe(true);
      expect(config.checks.length).toBeGreaterThan(0);
      expect(config.indexes.length).toBeGreaterThan(2);
    }
  });
  it("includes database immutability and draft-first enforcement in an additive migration", () => {
    const migration = readFileSync("drizzle/0024_marketing_generation_foundation.sql", "utf8");
    expect(migration).toContain("BEFORE UPDATE OR DELETE ON marketing_source_snapshots");
    expect(migration).toContain("BEFORE TRUNCATE ON marketing_source_snapshots");
    expect(migration).toContain("NEW.status <> 'draft'");
    expect(migration).not.toMatch(/DROP\s+(TABLE|COLUMN|DATABASE)|TRUNCATE\s+TABLE/i);
    expect(migration.match(/CREATE TABLE /g)).toHaveLength(3);
    expect(migration).not.toContain('CREATE TABLE "marketing_campaigns"');
    expect(migration.indexOf('CREATE UNIQUE INDEX "marketing_snapshots_context_unique"')).toBeLessThan(migration.indexOf('ADD CONSTRAINT "marketing_jobs_snapshot_context_fk"'));
  });
});
