import { describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { resolve } from "node:path";

const harnessPath = resolve(process.cwd(), "scripts/evaluate-citywalk-guide-api.mjs");
const env = {
  ...process.env,
  CITYWALK_RUN_LIVE_AI_EVAL: "NO",
  CITYWALK_EVAL_MAX_CALLS: "2",
  CITYWALK_EVAL_BASE_URL: "http://127.0.0.1:3000",
  CITYWALK_EVAL_CAPTURE_ANSWERS: "NO",
};

describe("CITYWALK guide API offline preflight (zero provider calls)", () => {
  it("remains disabled by default and never contacts the provider", () => {
    const result = execFileSync(process.execPath, [harnessPath], {
      env, encoding: "utf8", timeout: 10_000,
    });
    expect(result).toContain("disabled");
  });

  it("prints a fixed dry-run plan without touching an API, key, or private content", () => {
    const result = execFileSync(process.execPath, [harnessPath, "--dry-run"], {
      env: { ...env, GROQ_API_KEY: "TEST_SECRET_MUST_NOT_LEAK" },
      encoding: "utf8", timeout: 10_000,
    });
    const report = JSON.parse(result);
    expect(report).toMatchObject({
      mode: "dry-run",
      plannedHttpRequests: 2,
      maximumPotentialGroqAttemptsIfEnabled: 4,
      performedHttpRequests: 0,
      performedProviderCalls: 0,
      costIncurredByPreflight: 0,
      humanScoring: { status: "not_scored", reviewed: 0 },
    });
    expect(report.fixtureIds).toEqual(["en-supported", "en-false-date"]);
    expect(result).not.toContain("TEST_SECRET_MUST_NOT_LEAK");
    expect(result).not.toContain("When was Holstentor");
  });

  it("rejects non-localhost targets even in dry-run mode", () => {
    const run = spawnSync(process.execPath, [harnessPath, "--dry-run"], {
      env: { ...env, CITYWALK_EVAL_BASE_URL: "https://example.com" },
      encoding: "utf8", timeout: 10_000,
    });
    expect(run.status).not.toBe(0);
    expect(run.stderr).toContain("Only a plain HTTP localhost origin");
  });

  it("rejects zero, invalid, or excessive call limits", () => {
    for (const requested of ["0", "6", "NaN"]) {
      const run = spawnSync(process.execPath, [harnessPath, "--dry-run"], {
        env: { ...env, CITYWALK_EVAL_MAX_CALLS: requested },
        encoding: "utf8", timeout: 10_000,
      });
      expect(run.status).not.toBe(0);
      expect(run.stderr).toContain("CITYWALK_EVAL_MAX_CALLS");
    }
  });

  it("targets only the selected historical challenge and no provider calls", () => {
    const report = JSON.parse(execFileSync(process.execPath, [harnessPath, "--dry-run"], {
      env: { ...env, CITYWALK_EVAL_CASE_ID: "en-false-date", CITYWALK_EVAL_MAX_CALLS: "1" },
      encoding: "utf8", timeout: 10_000,
    }));
    expect(report).toMatchObject({
      fixtureIds: ["en-false-date"],
      plannedHttpRequests: 1,
      maximumPotentialGroqAttemptsIfEnabled: 2,
      performedHttpRequests: 0,
      performedProviderCalls: 0,
    });
  });

  it("fails closed on unrecognized fixture IDs before network access", () => {
    const run = spawnSync(process.execPath, [harnessPath, "--dry-run"], {
      env: { ...env, CITYWALK_EVAL_CASE_ID: "unknown-case", CITYWALK_EVAL_MAX_CALLS: "1" },
      encoding: "utf8", timeout: 10_000,
    });
    expect(run.status).not.toBe(0);
    expect(run.stderr).toContain("CITYWALK_EVAL_CASE_ID");
  });

  it("supports a one-fixture dry run with zero calls", () => {
    const report = JSON.parse(execFileSync(process.execPath, [harnessPath, "--dry-run"], {
      env: { ...env, CITYWALK_EVAL_MAX_CALLS: "1" },
      encoding: "utf8", timeout: 10_000,
    }));
    expect(report).toMatchObject({
      plannedHttpRequests: 1,
      maximumPotentialGroqAttemptsIfEnabled: 2,
      performedProviderCalls: 0,
    });
    expect(report.fixtureIds).toEqual(["en-supported"]);
  });
});
