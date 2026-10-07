import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { loadDatabaseEnvironment } from "@/db/loadEnvironment";
import {
  buildBackupInvocation,
  resolveBackupPath,
} from "./database-backup-restore";

loadDatabaseEnvironment();

function run(command: string, args: readonly string[], env: NodeJS.ProcessEnv) {
  const result = spawnSync(command, args, {
    env,
    stdio: "inherit",
  });
  if (result.error) {
    throw new Error(
      `${command} could not start. Install PostgreSQL client tools and retry.`,
    );
  }
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status ?? "unknown"}.`);
  }
}

function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for backup.");
  }

  const backupDirectory =
    process.env.CITYWALK_BACKUP_DIR?.trim() || "backups/postgres";
  const outputPath = resolveBackupPath(backupDirectory);
  const dryRun = process.argv.includes("--dry-run");

  if (dryRun) {
    console.log(
      `Backup preflight OK. A PostgreSQL custom-format dump would be written under ${path.resolve(backupDirectory)}.`,
    );
    return;
  }

  mkdirSync(path.dirname(outputPath), { recursive: true });
  const invocation = buildBackupInvocation(databaseUrl, outputPath);
  run(invocation.command, invocation.args, invocation.env);

  if (!existsSync(outputPath) || statSync(outputPath).size <= 0) {
    throw new Error("Backup did not produce a non-empty dump file.");
  }

  const bytes = readFileSync(outputPath);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const metadataPath = `${outputPath}.json`;
  writeFileSync(
    metadataPath,
    JSON.stringify(
      {
        format: "postgres-custom",
        createdAt: new Date().toISOString(),
        filename: path.basename(outputPath),
        bytes: bytes.byteLength,
        sha256,
        release:
          process.env.CITYWALK_RELEASE?.trim() ||
          process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
          "unknown",
      },
      null,
      2,
    ) + "\n",
    { mode: 0o600 },
  );

  console.log(
    `Backup created: ${outputPath} (${bytes.byteLength} bytes). Metadata: ${metadataPath}`,
  );
  console.log(
    "Treat the dump as sensitive data. Keep it encrypted, access-controlled, and outside Git.",
  );
}

try {
  main();
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Database backup failed.",
  );
  process.exitCode = 1;
}
