import path from "node:path";

export type CommandInvocation = Readonly<{
  command: string;
  args: readonly string[];
  env: NodeJS.ProcessEnv;
}>;

export type RestoreSafetyInput = Readonly<{
  sourceDatabaseUrl?: string;
  restoreDatabaseUrl?: string;
  restoreTarget?: string;
  runtimeEnvironment?: string;
  confirmed: boolean;
}>;

function parseDatabaseUrl(databaseUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("Database URL is invalid.");
  }

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("Database URL must use postgres:// or postgresql://.");
  }
  if (!parsed.hostname) throw new Error("Database URL must include a host.");
  if (!parsed.pathname || parsed.pathname === "/") {
    throw new Error("Database URL must include a database name.");
  }
  return parsed;
}

export function toLibpqEnvironment(
  databaseUrl: string,
  baseEnvironment: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const parsed = parseDatabaseUrl(databaseUrl);
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  const result: NodeJS.ProcessEnv = {
    ...baseEnvironment,
    PGHOST: parsed.hostname,
    PGPORT: parsed.port || "5432",
    PGDATABASE: databaseName,
  };

  if (parsed.username) result.PGUSER = decodeURIComponent(parsed.username);
  if (parsed.password) result.PGPASSWORD = decodeURIComponent(parsed.password);

  const sslMode = parsed.searchParams.get("sslmode");
  const channelBinding = parsed.searchParams.get("channel_binding");
  if (sslMode) result.PGSSLMODE = sslMode;
  if (channelBinding) result.PGCHANNELBINDING = channelBinding;

  return result;
}

export function databaseNameFromUrl(databaseUrl: string): string {
  const parsed = parseDatabaseUrl(databaseUrl);
  return decodeURIComponent(parsed.pathname.replace(/^\//, ""));
}

export function createBackupFilename(now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return `citywalk-${stamp}.dump`;
}

export function resolveBackupPath(
  backupDirectory: string,
  now = new Date(),
): string {
  return path.resolve(backupDirectory, createBackupFilename(now));
}

export function buildBackupInvocation(
  databaseUrl: string,
  outputPath: string,
  baseEnvironment: NodeJS.ProcessEnv = process.env,
): CommandInvocation {
  return {
    command: "pg_dump",
    args: [
      "--format=custom",
      "--no-owner",
      "--no-acl",
      "--file",
      outputPath,
    ],
    env: toLibpqEnvironment(databaseUrl, baseEnvironment),
  };
}

export function assertSafeRestoreTarget(input: RestoreSafetyInput): void {
  if (!input.confirmed) {
    throw new Error("Restore requires --confirm-non-production.");
  }
  if (input.restoreTarget !== "non-production") {
    throw new Error("CITYWALK_RESTORE_TARGET must be exactly non-production.");
  }
  if (input.runtimeEnvironment?.trim().toLowerCase() === "production") {
    throw new Error("Restore is blocked while CITYWALK_RUNTIME_ENV=production.");
  }
  if (!input.restoreDatabaseUrl?.trim()) {
    throw new Error("RESTORE_DATABASE_URL is required.");
  }

  const restore = parseDatabaseUrl(input.restoreDatabaseUrl).toString();
  if (
    input.sourceDatabaseUrl?.trim() &&
    parseDatabaseUrl(input.sourceDatabaseUrl).toString() === restore
  ) {
    throw new Error("RESTORE_DATABASE_URL must not equal DATABASE_URL.");
  }
}

export function buildRestoreInvocation(
  restoreDatabaseUrl: string,
  dumpPath: string,
  baseEnvironment: NodeJS.ProcessEnv = process.env,
): CommandInvocation {
  const databaseName = databaseNameFromUrl(restoreDatabaseUrl);
  return {
    command: "pg_restore",
    args: [
      "--clean",
      "--if-exists",
      "--no-owner",
      "--no-privileges",
      "--exit-on-error",
      "--dbname",
      databaseName,
      dumpPath,
    ],
    env: toLibpqEnvironment(restoreDatabaseUrl, baseEnvironment),
  };
}

export function buildRestoreListInvocation(
  dumpPath: string,
  baseEnvironment: NodeJS.ProcessEnv = process.env,
): CommandInvocation {
  return {
    command: "pg_restore",
    args: ["--list", dumpPath],
    env: { ...baseEnvironment },
  };
}
