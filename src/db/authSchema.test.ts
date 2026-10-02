import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  account,
  session,
  staffCityAccess,
  staffMemberships,
  staffRoleEnum,
  user,
  verification,
} from "@/db/authSchema";

describe("auth and staff database schema", () => {
  it("keeps Better Auth core tables separate from catalog tables", () => {
    expect(
      [user, session, account, verification].map(
        (table) => getTableConfig(table).name,
      ),
    ).toEqual(["user", "session", "account", "verification"]);
  });

  it("defines only the supported CITYWALK staff roles", () => {
    expect(staffRoleEnum.enumValues).toEqual([
      "super_admin",
      "admin",
      "content_editor",
      "reviewer_publisher",
    ]);
  });

  it("keeps the legacy issuer column nullable and without the 1.7.0-1.7.2 unique index", () => {
    const accountConfig = getTableConfig(account);
    expect(
      accountConfig.columns.find((column) => column.name === "issuer")?.notNull,
    ).toBe(false);
    expect(
      accountConfig.indexes.some(
        (index) => index.config.name === "account_issuer_account_id_unique",
      ),
    ).toBe(false);
  });

  it("enforces one membership per identity and one city scope pair", () => {
    const membershipConfig = getTableConfig(staffMemberships);
    const cityScopeConfig = getTableConfig(staffCityAccess);

    expect(
      membershipConfig.indexes.some(
        (index) => index.config.name === "staff_memberships_user_id_unique" && index.config.unique,
      ),
    ).toBe(true);
    expect(cityScopeConfig.primaryKeys).toHaveLength(1);
    expect(cityScopeConfig.primaryKeys[0]?.columns).toHaveLength(2);
    expect(membershipConfig.foreignKeys).toHaveLength(2);
    expect(cityScopeConfig.foreignKeys).toHaveLength(2);
  });
});
