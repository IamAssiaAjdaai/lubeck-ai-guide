import { describe, expect, it } from "vitest";

import {
  assertSafeRestoreTarget,
  buildBackupInvocation,
  buildRestoreInvocation,
  createBackupFilename,
  databaseNameFromUrl,
  toLibpqEnvironment,
} from "./database-backup-restore";

describe("database backup/restore safety", () => {
  const source =
    "postgresql://source-user:source-password@source.example:5433/citywalk_prod?sslmode=require";
  const restore =
    "postgresql://restore-user:restore-password@restore.example:5434/citywalk_restore?sslmode=require";

  it("creates deterministic UTC backup filenames", () => {
    expect(createBackupFilename(new Date("2026-10-07T19:45:12.345Z")))
      .toBe("citywalk-20261007T194512Z.dump");
  });

  it("maps a PostgreSQL URL to libpq environment variables", () => {
    const env = toLibpqEnvironment(source, { PATH: "/usr/bin" });

    expect(env).toMatchObject({
      PATH: "/usr/bin",
      PGHOST: "source.example",
      PGPORT: "5433",
      PGDATABASE: "citywalk_prod",
      PGUSER: "source-user",
      PGPASSWORD: "source-password",
      PGSSLMODE: "require",
    });
    expect(databaseNameFromUrl(source)).toBe("citywalk_prod");
  });

  it("keeps credentials out of pg_dump command arguments", () => {
    const invocation = buildBackupInvocation(source, "/tmp/citywalk.dump", {});

    expect(invocation.command).toBe("pg_dump");
    expect(invocation.args).toContain("/tmp/citywalk.dump");
    expect(invocation.args.join(" ")).not.toMatch(
      /source-user|source-password|source\.example/,
    );
  });

  it("requires an explicit non-production restore acknowledgement", () => {
    expect(() =>
      assertSafeRestoreTarget({
        restoreDatabaseUrl: restore,
        restoreTarget: "non-production",
        runtimeEnvironment: "development",
        confirmed: false,
      }),
    ).toThrow(/confirm-non-production/);

    expect(() =>
      assertSafeRestoreTarget({
        restoreDatabaseUrl: restore,
        restoreTarget: "production",
        runtimeEnvironment: "development",
        confirmed: true,
      }),
    ).toThrow(/exactly non-production/);
  });

  it("blocks restore while the operator environment is production", () => {
    expect(() =>
      assertSafeRestoreTarget({
        restoreDatabaseUrl: restore,
        restoreTarget: "non-production",
        runtimeEnvironment: "production",
        confirmed: true,
      }),
    ).toThrow(/blocked/);
  });

  it("blocks a restore target that is identical to DATABASE_URL", () => {
    expect(() =>
      assertSafeRestoreTarget({
        sourceDatabaseUrl: source,
        restoreDatabaseUrl: source,
        restoreTarget: "non-production",
        runtimeEnvironment: "development",
        confirmed: true,
      }),
    ).toThrow(/must not equal/);
  });

  it("builds pg_restore without putting credentials or host in arguments", () => {
    const invocation = buildRestoreInvocation(
      restore,
      "/tmp/citywalk.dump",
      {},
    );

    expect(invocation.command).toBe("pg_restore");
    expect(invocation.args).toEqual([
      "--clean",
      "--if-exists",
      "--no-owner",
      "--no-privileges",
      "--exit-on-error",
      "--dbname",
      "citywalk_restore",
      "/tmp/citywalk.dump",
    ]);
    expect(invocation.args.join(" ")).not.toMatch(
      /restore-user|restore-password|restore\.example/,
    );
    expect(invocation.env).toMatchObject({
      PGHOST: "restore.example",
      PGDATABASE: "citywalk_restore",
      PGUSER: "restore-user",
      PGPASSWORD: "restore-password",
    });
  });

  it("rejects malformed and non-PostgreSQL URLs", () => {
    expect(() => toLibpqEnvironment("not-a-url", {})).toThrow(/invalid/);
    expect(() => toLibpqEnvironment("https://example.com/db", {}))
      .toThrow(/postgres/);
  });
});
