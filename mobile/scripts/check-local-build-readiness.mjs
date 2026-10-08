#!/usr/bin/env node

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function commandResult(command, args = []) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = [result.stdout, result.stderr]
    .filter(Boolean)
    .join("\n")
    .trim()
    .split("\n")[0];

  return {
    ok: result.status === 0,
    detail: output || null,
  };
}

function major(version) {
  const parsed = Number.parseInt(String(version).split(".")[0] ?? "", 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function detectLocalMobileBuildReadiness({
  platform = process.platform,
  env = process.env,
  nodeVersion = process.versions.node,
  home = homedir(),
  run = commandResult,
  fileExists = existsSync,
} = {}) {
  const nodeMajor = major(nodeVersion);
  const node = {
    ok: nodeMajor !== null && nodeMajor >= 22,
    detail: `Node ${nodeVersion}`,
  };
  const npm = run("npm", ["--version"]);

  const xcodeSelect = platform === "darwin"
    ? run("xcode-select", ["-p"])
    : { ok: false, detail: "macOS required for iOS builds" };
  const xcodeBuild = platform === "darwin"
    ? run("xcodebuild", ["-version"])
    : { ok: false, detail: "macOS required for iOS builds" };
  const cocoaPods = platform === "darwin"
    ? run("pod", ["--version"])
    : { ok: false, detail: "macOS required for iOS builds" };

  const java = run("java", ["-version"]);
  const keytool = run("keytool", ["-help"]);

  const androidSdkRoot =
    env.ANDROID_HOME?.trim() ||
    env.ANDROID_SDK_ROOT?.trim() ||
    (platform === "darwin" ? join(home, "Library", "Android", "sdk") : "");

  const androidSdk = {
    ok: Boolean(androidSdkRoot && fileExists(androidSdkRoot)),
    detail: androidSdkRoot || "ANDROID_HOME / ANDROID_SDK_ROOT not configured",
  };

  const adbFromPath = run("adb", ["version"]);
  const adbPath = androidSdkRoot
    ? join(androidSdkRoot, "platform-tools", platform === "win32" ? "adb.exe" : "adb")
    : "";
  const adb = {
    ok: adbFromPath.ok || Boolean(adbPath && fileExists(adbPath)),
    detail: adbFromPath.detail || (adbPath || "adb not found"),
  };

  const iosReady =
    platform === "darwin" &&
    node.ok &&
    npm.ok &&
    xcodeSelect.ok &&
    xcodeBuild.ok &&
    cocoaPods.ok;

  const androidReady =
    node.ok &&
    npm.ok &&
    java.ok &&
    keytool.ok &&
    androidSdk.ok &&
    adb.ok;

  return {
    platform,
    checks: {
      node,
      npm,
      xcodeSelect,
      xcodeBuild,
      cocoaPods,
      java,
      keytool,
      androidSdk,
      adb,
    },
    iosReady,
    androidReady,
    allReady: iosReady && androidReady,
  };
}

function printHuman(result) {
  const rows = [
    ["Node.js 22+", result.checks.node],
    ["npm", result.checks.npm],
    ["Xcode selection", result.checks.xcodeSelect],
    ["Xcode build tools", result.checks.xcodeBuild],
    ["CocoaPods", result.checks.cocoaPods],
    ["Java / OpenJDK", result.checks.java],
    ["keytool", result.checks.keytool],
    ["Android SDK", result.checks.androidSdk],
    ["adb", result.checks.adb],
  ];

  console.log("CITYWALK local mobile build readiness");
  console.log("-------------------------------------");
  for (const [label, check] of rows) {
    const mark = check.ok ? "✓" : "✗";
    const detail = check.detail ? ` — ${check.detail}` : "";
    console.log(`${mark} ${label}${detail}`);
  }

  console.log("");
  console.log(`iOS local builds:     ${result.iosReady ? "READY" : "NOT READY"}`);
  console.log(`Android local builds: ${result.androidReady ? "READY" : "NOT READY"}`);

  if (!result.allReady) {
    console.log("");
    console.log("Install/configure only the failed items above, then run this check again.");
    console.log("This command does not install software or change system settings.");
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = detectLocalMobileBuildReadiness();

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printHuman(result);
  }

  process.exitCode = result.allReady ? 0 : 1;
}
