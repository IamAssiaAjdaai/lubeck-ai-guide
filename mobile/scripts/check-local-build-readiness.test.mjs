import { describe, expect, it } from "vitest";

import { detectLocalMobileBuildReadiness } from "./check-local-build-readiness.mjs";

function passingRunner(command) {
  return {
    ok: true,
    detail: command === "xcodebuild" ? "Xcode 16" : `${command} available`,
  };
}

describe("local mobile build readiness", () => {
  it("reports a fully configured MacBook as ready for iOS and Android", () => {
    const result = detectLocalMobileBuildReadiness({
      platform: "darwin",
      nodeVersion: "22.23.3",
      home: "/Users/citywalk",
      env: { ANDROID_HOME: "/Users/citywalk/Library/Android/sdk" },
      run: passingRunner,
      fileExists: () => true,
    });

    expect(result.iosReady).toBe(true);
    expect(result.androidReady).toBe(true);
    expect(result.allReady).toBe(true);
  });

  it("reports missing CocoaPods without blocking an otherwise valid Android toolchain", () => {
    const result = detectLocalMobileBuildReadiness({
      platform: "darwin",
      nodeVersion: "22.23.3",
      home: "/Users/citywalk",
      env: { ANDROID_HOME: "/Users/citywalk/Library/Android/sdk" },
      run(command) {
        if (command === "pod") return { ok: false, detail: null };
        return passingRunner(command);
      },
      fileExists: () => true,
    });

    expect(result.iosReady).toBe(false);
    expect(result.androidReady).toBe(true);
    expect(result.allReady).toBe(false);
  });

  it("fails Android readiness when the SDK is absent even if Java is installed", () => {
    const result = detectLocalMobileBuildReadiness({
      platform: "darwin",
      nodeVersion: "22.23.3",
      home: "/Users/citywalk",
      env: {},
      run(command) {
        if (command === "adb") return { ok: false, detail: null };
        return passingRunner(command);
      },
      fileExists: () => false,
    });

    expect(result.checks.androidSdk.ok).toBe(false);
    expect(result.checks.adb.ok).toBe(false);
    expect(result.androidReady).toBe(false);
  });

  it("requires Node 22 or newer for both local build paths", () => {
    const result = detectLocalMobileBuildReadiness({
      platform: "darwin",
      nodeVersion: "20.19.0",
      env: { ANDROID_HOME: "/sdk" },
      run: passingRunner,
      fileExists: () => true,
    });

    expect(result.checks.node.ok).toBe(false);
    expect(result.iosReady).toBe(false);
    expect(result.androidReady).toBe(false);
  });
});
