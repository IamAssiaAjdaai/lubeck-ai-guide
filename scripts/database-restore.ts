import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { loadDatabaseEnvironment } from "@/db/loadEnvironment";
import {
  assertSafeRestoreTarget,
  buildRestoreInvocation,
  buildRestoreListInvocation,
} from "./database-backup-restore";

loadDatabaseEnvironment();

function argumentValue(prefix: string): string | undefined {
  const argument = process.argv.find((value) => value.startsWith(prefix));
  return argument?.slice(prefix.length).trim() || undefined;
}

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

function verifyCompanionHash(dumpPath: string) {
  const metadataPath = `${dumpPath}.json`;
  if (!existsSync(metadataPath)) {
    console.warn(
      "No companion metadata file found; continuing after pg_restore archive validation.",
    );
    return;
  }

  const metadata = JSON.parse(readFileSync(metadataPath, "utf8")) as {
    sha256?: unknown;
  };
  if (
    typeof metadata.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(metadata.sha256)
  ) {
    throw new Error("Backup metadata contains an invalid SHA-256 checksum.");
  }

  const actual = createHash("sha256")
    .update(readFileSync(dumpPath))
    .digest("hex");
  if (actual !== metadata.sha256) {
    throw new Error("Backup checksum verification failed.");
  }
}

function main() {
  const dumpArgument = argumentValue("--file=");
  if (!dumpArgument) {
    throw new Error("Restore requires --file=/path/to/backup.dump.");
  }
  const dumpPath = path.resolve(dumpArgument);
  if (!existsSync(dumpPath)) {
    throw new Error("Restore dump file does not exist.");
  }

  const restoreDatabaseUrl = process.env.RESTORE_DATABASE_URL?.trim();
  assertSafeRestoreTarget({
    sourceDatabaseUrl: process.env.DATABASE_URL,
    restoreDatabaseUrl,
    restoreTarget: process.env.CITYWALK_RESTORE_TARGET,
    runtimeEnvironment: process.env.CITYWALK_RUNTIME_ENV,
    confirmed: process.argv.includes("--confirm-non-production"),
  });

  verifyCompanionHash(dumpPath);

  const list = buildRestoreListInvocation(dumpPath);
  run(list.command, list.args, list.env);

  if (process.argv.includes("--dry-run")) {
    console.log(
      "Restore preflight OK. Safety guard, checksum/archive validation, and target configuration passed.",
    );
    return;
  }

  const restore = buildRestoreInvocation(restoreDatabaseUrl!, dumpPath);
  run(restore.command, restore.args, restore.env);

  const verify = spawnSync("npm", ["run", "db:verify"], {
    env: {
      ...process.env,
      DATABASE_URL: restoreDatabaseUrl!,
      CITYWALK_RUNTIME_ENV: "test",
    },
    stdio: "inherit",
  });
  if (verify.error || verify.status !== 0) {
    throw new Error(
      "Restore completed but database verification failed. Keep the target isolated and investigate before using it.",
    );
  }

  console.log(
    "Restore drill passed on the explicitly acknowledged non-production target.",
  );
}

try {
  main();
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Database restore failed.",
  );
  process.exitCode = 1;
}
