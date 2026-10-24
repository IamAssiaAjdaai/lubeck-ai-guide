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

  it("matches Better Auth 1.7 account schema without the retired issuer identity key", () => {
    const accountConfig = getTableConfig(account);

    expect(accountConfig.columns.map((column) => column.name)).toEqual([
      "id",
      "account_id",
      "provider_id",
      "user_id",
      "access_token",
      "refresh_token",
      "id_token",
      "access_token_expires_at",
      "refresh_token_expires_at",
      "scope",
      "password",
      "created_at",
      "updated_at",
    ]);
    expect(accountConfig.indexes.map((index) => index.config.name)).toEqual([
      "account_user_id_idx",
    ]);
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
