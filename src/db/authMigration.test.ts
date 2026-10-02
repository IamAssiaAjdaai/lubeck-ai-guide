import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("Better Auth account identity migration", () => {
  it("fails closed on duplicate provider/account identities before removing issuer", () => {
    const migration = readFileSync(
      resolve(process.cwd(), "drizzle/0017_better_auth_account_identity.sql"),
      "utf8",
    );

    const duplicatePairCheck = migration.indexOf(
      'GROUP BY "provider_id", "account_id"',
    );
    const failClosed = migration.indexOf("RAISE EXCEPTION");
    const dropOldIndex = migration.indexOf(
      'DROP INDEX IF EXISTS "account_issuer_account_id_unique"',
    );
    const dropIssuer = migration.indexOf(
      'ALTER TABLE "account" DROP COLUMN "issuer"',
    );

    expect(duplicatePairCheck).toBeGreaterThanOrEqual(0);
    expect(failClosed).toBeGreaterThan(duplicatePairCheck);
    expect(dropOldIndex).toBeGreaterThan(failClosed);
    expect(dropIssuer).toBeGreaterThan(dropOldIndex);
  });
});
