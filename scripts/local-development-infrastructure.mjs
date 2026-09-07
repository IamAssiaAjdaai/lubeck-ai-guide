import { execFile, spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const WINDOWS_DOCKER_DESKTOP_PATH =
  "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe";

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_POLL_INTERVAL_MS = 2_000;

/**
 * @typedef {{ ok: boolean, commandMissing?: boolean }} CommandResult
 * @typedef {{
 *   platform: NodeJS.Platform,
 *   dockerDesktopPaths: readonly string[],
 *   migrationCommand: { executable: string, prefixArgs: readonly string[] },
 *   runCommand(command: string, args: readonly string[]): Promise<CommandResult>,
 *   fileExists(path: string): Promise<boolean>,
 *   launchDetached(executable: string): Promise<void>,
 *   wait(milliseconds: number): Promise<void>,
 *   now(): number,
 *   log(message: string): void,
 * }} LocalInfrastructureDependencies
 * @typedef {{ dockerTimeoutMs?: number, pollIntervalMs?: number }} LocalInfrastructureOptions
 */

export class LocalInfrastructureError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = "LocalInfrastructureError";
  }
}

/**
 * @param {LocalInfrastructureDependencies} [dependencies]
 * @param {LocalInfrastructureOptions} [options]
 */
export async function ensureLocalInfrastructure(
  dependencies = createSystemDependencies(),
  options = {},
) {
  const dockerTimeoutMs = options.dockerTimeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;

  dependencies.log("CITYWALK local setup");

  let docker = await dependencies.runCommand("docker", ["info"]);
  if (docker.commandMissing) {
    throw new LocalInfrastructureError(
      "Docker CLI was not found. Install Docker Desktop and ensure docker is available on PATH.",
    );
  }

  if (!docker.ok) {
    if (dependencies.platform !== "win32") {
      throw new LocalInfrastructureError(
        "Docker Engine is not available. Start Docker manually, then run the command again.",
      );
    }
    const dockerDesktopPath = await findFirstExistingPath(
      dependencies.dockerDesktopPaths,
      dependencies.fileExists,
    );
    if (!dockerDesktopPath) {
      throw new LocalInfrastructureError(
        `Docker Engine is unavailable and Docker Desktop was not found at ${WINDOWS_DOCKER_DESKTOP_PATH} or the current user's local application directory. Start or install Docker Desktop, then try again.`,
      );
    }

    dependencies.log("Starting Docker Desktop…");
    try {
      await dependencies.launchDetached(dockerDesktopPath);
    } catch {
      throw new LocalInfrastructureError(
        "Docker Desktop could not be launched. Start it manually, then run the command again.",
      );
    }

    const deadline = dependencies.now() + dockerTimeoutMs;
    while (!docker.ok && dependencies.now() < deadline) {
      await dependencies.wait(pollIntervalMs);
      docker = await dependencies.runCommand("docker", ["info"]);
      if (docker.commandMissing) {
        throw new LocalInfrastructureError(
          "Docker CLI became unavailable while waiting for Docker Desktop.",
        );
      }
    }
    if (!docker.ok) {
      throw new LocalInfrastructureError(
        `Docker Engine did not become ready within ${Math.ceil(dockerTimeoutMs / 1_000)} seconds. Open Docker Desktop, resolve any startup error, and try again.`,
      );
    }
  }

  dependencies.log("✓ Docker Engine ready");

  const compose = await dependencies.runCommand("docker", [
    "compose",
    "up",
    "-d",
    "--wait",
  ]);
  if (!compose.ok) {
    throw new LocalInfrastructureError(
      "PostgreSQL could not be started. Run `docker compose up -d --wait` to inspect the error.",
    );
  }
  dependencies.log("✓ PostgreSQL healthy");

  const migration = await dependencies.runCommand(
    dependencies.migrationCommand.executable,
    [
      ...dependencies.migrationCommand.prefixArgs,
      "run",
      "db:migrate",
    ],
  );
  if (!migration.ok) {
    throw new LocalInfrastructureError(
      "Database migrations failed. Run `npm run db:migrate` to inspect the error.",
    );
  }
  dependencies.log("✓ Database migrations applied");
  dependencies.log("Starting Next.js…");
}

/** @returns {LocalInfrastructureDependencies} */
export function createSystemDependencies() {
  return {
    platform: process.platform,
    dockerDesktopPaths: getWindowsDockerDesktopPaths(process.env.LOCALAPPDATA),
    migrationCommand: getMigrationCommand(),
    runCommand: runSystemCommand,
    fileExists: async (path) => {
      try {
        await access(path);
        return true;
      } catch {
        return false;
      }
    },
    launchDetached: launchSystemProcessDetached,
    wait: (milliseconds) => new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    }),
    now: Date.now,
    log: console.log,
  };
}

/** @param {string | undefined} localAppData */
export function getWindowsDockerDesktopPaths(localAppData) {
  const paths = [WINDOWS_DOCKER_DESKTOP_PATH];
  if (localAppData) {
    paths.push(
      join(localAppData, "Programs", "DockerDesktop", "Docker Desktop.exe"),
    );
  }
  return [...new Set(paths)];
}

function getMigrationCommand() {
  if (process.env.npm_execpath) {
    return {
      executable: process.execPath,
      prefixArgs: [process.env.npm_execpath],
    };
  }
  if (process.platform === "win32") {
    return {
      executable: process.env.ComSpec ?? "cmd.exe",
      prefixArgs: ["/d", "/s", "/c", "npm.cmd"],
    };
  }
  return { executable: "npm", prefixArgs: [] };
}

/**
 * @param {readonly string[]} paths
 * @param {(path: string) => Promise<boolean>} fileExists
 */
async function findFirstExistingPath(paths, fileExists) {
  for (const path of paths) {
    if (await fileExists(path)) {
      return path;
    }
  }
  return undefined;
}

/**
 * @param {string} command
 * @param {readonly string[]} args
 * @returns {Promise<CommandResult>}
 */
async function runSystemCommand(command, args) {
  try {
    await execFileAsync(command, [...args], {
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      ...(isMissingCommandError(error) ? { commandMissing: true } : {}),
    };
  }
}

/** @param {string} executable */
function launchSystemProcessDetached(executable) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, [], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

/** @param {unknown} error */
function isMissingCommandError(error) {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "ENOENT",
  );
}
