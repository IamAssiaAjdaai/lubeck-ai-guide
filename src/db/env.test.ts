import { afterEach, describe, expect, it } from "vitest";

import { getDatabaseUrl } from "@/db/env";

const originalDatabaseUrl = process.env.DATABASE_URL;

afterEach(() => {
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }
});

describe("database environment", () => {
  it("returns DATABASE_URL when configured", () => {
    process.env.DATABASE_URL =
      "postgresql://user:password@localhost:5432/citywalk";

    expect(getDatabaseUrl()).toBe(
      "postgresql://user:password@localhost:5432/citywalk",
    );
  });

  it("throws when DATABASE_URL is missing", () => {
    delete process.env.DATABASE_URL;

    expect(() => getDatabaseUrl()).toThrow(
      "DATABASE_URL is not configured",
    );
  });
});