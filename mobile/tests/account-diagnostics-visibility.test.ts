import { describe, expect, it } from "vitest";

import { accountDiagnosticsEnabled } from "../src/lib/accountDiagnostics";

describe("account build diagnostics visibility", () => {
  it("stays hidden in ordinary production builds", () => {
    expect(accountDiagnosticsEnabled("production", undefined)).toBe(false);
    expect(accountDiagnosticsEnabled("production", "0")).toBe(false);
  });

  it("remains available in development, tests and explicit QA builds", () => {
    expect(accountDiagnosticsEnabled("development", undefined)).toBe(true);
    expect(accountDiagnosticsEnabled("test", undefined)).toBe(true);
    expect(accountDiagnosticsEnabled("production", "1")).toBe(true);
  });
});
