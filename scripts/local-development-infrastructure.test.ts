import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  ensureLocalInfrastructure,
  getWindowsDockerDesktopPaths,
  WINDOWS_DOCKER_DESKTOP_PATH,
} from "./local-development-infrastructure.mjs";

describe("local development infrastructure bootstrap", () => {
  it("continues immediately when Docker is already ready", async () => {
    const harness = createHarness();

    await ensureLocalInfrastructure(harness.dependencies);

    expect(harness.runCommand.mock.calls).toEqual([
      ["docker", ["info"]],
      ["docker", ["compose", "up", "-d", "--wait"]],
      ["npm.cmd", ["run", "db:migrate"]],
    ]);
    expect(harness.launchDetached).not.toHaveBeenCalled();
    expect(harness.logs).toEqual([
      "CITYWALK local setup",
      "✓ Docker Engine ready",
      "✓ PostgreSQL healthy",
      "✓ Database migrations applied",
      "Starting Next.js…",
    ]);
  });

  it("launches Docker Desktop detached on Windows and waits quietly", async () => {
    const harness = createHarness();
    harness.runCommand
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValue({ ok: true });

    await ensureLocalInfrastructure(harness.dependencies, {
      dockerTimeoutMs: 100,
      pollIntervalMs: 10,
    });

    expect(harness.fileExists).toHaveBeenCalledWith(
      WINDOWS_DOCKER_DESKTOP_PATH,
    );
    expect(harness.launchDetached).toHaveBeenCalledWith(
      WINDOWS_DOCKER_DESKTOP_PATH,
    );
    expect(harness.wait).toHaveBeenCalledTimes(2);
    expect(harness.logs.filter((line) => line.includes("Docker Desktop"))).toEqual([
      "Starting Docker Desktop…",
    ]);
  });

  it("supports Docker Desktop installed for the current Windows user", async () => {
    const perUserPath =
      "C:\\Users\\developer\\AppData\\Local\\Programs\\DockerDesktop\\Docker Desktop.exe";
    const harness = createHarness({
      desktopPaths: [WINDOWS_DOCKER_DESKTOP_PATH, perUserPath],
      existingDesktopPath: perUserPath,
    });
    harness.runCommand
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValue({ ok: true });

    await ensureLocalInfrastructure(harness.dependencies);

    expect(harness.fileExists.mock.calls).toEqual([
      [WINDOWS_DOCKER_DESKTOP_PATH],
      [perUserPath],
    ]);
    expect(harness.launchDetached).toHaveBeenCalledWith(perUserPath);
  });

  it("builds stable Windows Docker Desktop candidate paths", () => {
    expect(getWindowsDockerDesktopPaths("C:\\Users\\developer\\AppData\\Local"))
      .toEqual([
        WINDOWS_DOCKER_DESKTOP_PATH,
        "C:\\Users\\developer\\AppData\\Local\\Programs\\DockerDesktop\\Docker Desktop.exe",
      ]);
  });

  it("asks non-Windows developers to start Docker manually", async () => {
    const harness = createHarness({ platform: "linux" });
    harness.runCommand.mockResolvedValueOnce({ ok: false });

    await expect(
      ensureLocalInfrastructure(harness.dependencies),
    ).rejects.toThrow(/Start Docker manually/);
    expect(harness.launchDetached).not.toHaveBeenCalled();
  });

  it("fails clearly when the Docker CLI or Docker Desktop is missing", async () => {
    const missingCli = createHarness();
    missingCli.runCommand.mockResolvedValueOnce({
      ok: false,
      commandMissing: true,
    });
    await expect(
      ensureLocalInfrastructure(missingCli.dependencies),
    ).rejects.toThrow(/Docker CLI was not found/);

    const missingDesktop = createHarness({ existingDesktopPath: null });
    missingDesktop.runCommand.mockResolvedValueOnce({ ok: false });
    await expect(
      ensureLocalInfrastructure(missingDesktop.dependencies),
    ).rejects.toThrow(/Docker Desktop was not found/);
  });

  it("times out with an actionable error instead of polling forever", async () => {
    const harness = createHarness();
    harness.runCommand.mockResolvedValue({ ok: false });

    await expect(
      ensureLocalInfrastructure(harness.dependencies, {
        dockerTimeoutMs: 20,
        pollIntervalMs: 10,
      }),
    ).rejects.toThrow(/did not become ready within 1 seconds/);
    expect(harness.wait).toHaveBeenCalledTimes(2);
  });

  it("stops when Compose or migration execution fails", async () => {
    const composeFailure = createHarness();
    composeFailure.runCommand
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false });
    await expect(
      ensureLocalInfrastructure(composeFailure.dependencies),
    ).rejects.toThrow(/PostgreSQL could not be started/);
    expect(composeFailure.runCommand).toHaveBeenCalledTimes(2);

    const migrationFailure = createHarness();
    migrationFailure.runCommand
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false });
    await expect(
      ensureLocalInfrastructure(migrationFailure.dependencies),
    ).rejects.toThrow(/Database migrations failed/);
  });

  it("wires only local dev and start commands to the bootstrap", async () => {
    const packageJson = JSON.parse(
      await readFile(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };

    expect(packageJson.scripts.predev).toBe("npm run dev:infra");
    expect(packageJson.scripts["dev:infra"]).toBe(
      "node scripts/ensure-local-infrastructure.mjs",
    );
    expect(packageJson.scripts.dev).toBe("next dev");
    expect(packageJson.scripts.prestart).toBe("npm run dev:infra");
    expect(packageJson.scripts.start).toBe("next start");
    expect(packageJson.scripts["vercel-build"]).toBe(
      "npm run db:migrate && next build",
    );
  });
});

function createHarness({
  platform = "win32",
  desktopPaths = [WINDOWS_DOCKER_DESKTOP_PATH],
  existingDesktopPath = WINDOWS_DOCKER_DESKTOP_PATH,
}: Readonly<{
  platform?: NodeJS.Platform;
  desktopPaths?: readonly string[];
  existingDesktopPath?: string | null;
}> = {}) {
  let currentTime = 0;
  const logs: string[] = [];
  const runCommand = vi.fn(async (): Promise<{
    ok: boolean;
    commandMissing?: boolean;
  }> => ({ ok: true }));
  const fileExists = vi.fn(async (path: string) => path === existingDesktopPath);
  const launchDetached = vi.fn(async () => undefined);
  const wait = vi.fn(async (milliseconds: number) => {
    currentTime += milliseconds;
  });
  const dependencies = {
    platform,
    dockerDesktopPaths: desktopPaths,
    migrationCommand: {
      executable: platform === "win32" ? "npm.cmd" : "npm",
      prefixArgs: [],
    },
    runCommand,
    fileExists,
    launchDetached,
    wait,
    now: () => currentTime,
    log: (message: string) => logs.push(message),
  };
  return {
    dependencies,
    fileExists,
    launchDetached,
    logs,
    runCommand,
    wait,
  };
}
