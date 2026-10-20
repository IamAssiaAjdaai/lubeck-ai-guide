import { randomInt } from "node:crypto";
import { Client } from "pg";

/** Reject driver URL overrides before any connection; pin localhost to IPv4. */
export function disposablePostgresUrls(value: string, prefix: string) {
  let base: URL;
  try { base = new URL(value); } catch { throw new Error("Invalid integration database URL."); }
  if (!/^cw_[a-z]+$/.test(prefix) ||
      !["postgres:", "postgresql:"].includes(base.protocol) ||
      !["127.0.0.1", "localhost", "[::1]"].includes(base.hostname) ||
      base.search || base.hash) {
    throw new Error("Integration tests require loopback PostgreSQL without URL query overrides.");
  }
  // Fresh URLs prevent pg's host/port/database query overrides and PGHOST fallback.
  base.hostname = "127.0.0.1";
  const databaseName = `${prefix}_${Date.now()}${process.pid}${randomInt(100000)}`;
  const target = new URL(base);
  target.pathname = `/${databaseName}`;
  return { adminUrl: base.toString(), databaseUrl: target.toString(), databaseName };
}

export async function withDisposablePostgres(
  value: string,
  prefix: string,
  run: (databaseUrl: string) => Promise<void>,
): Promise<void> {
  const { adminUrl, databaseUrl, databaseName } = disposablePostgresUrls(value, prefix);
  const admin = new Client({ connectionString: adminUrl, connectionTimeoutMillis: 5000 });
  let created = false;
  try {
    await admin.connect();
    await admin.query(`CREATE DATABASE "${databaseName}"`);
    created = true;
    await run(databaseUrl);
  } finally {
    try {
      if (created) {
        await admin.query(
          "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
          [databaseName],
        );
        await admin.query(`DROP DATABASE "${databaseName}"`);
      }
    } finally { await admin.end(); }
  }
}
