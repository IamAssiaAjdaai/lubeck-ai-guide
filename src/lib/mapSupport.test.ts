import { describe, expect, it, vi } from "vitest";

import {
  getFatalMapErrorReason,
  getMapFailureDevelopmentLabel,
  isWebGL2Supported,
  reportMapInitializationFailure,
} from "@/lib/mapSupport";

describe("map support", () => {
  it("maps failures to fixed non-sensitive development labels", () => {
    expect(getMapFailureDevelopmentLabel("webgl2-unavailable")).toBe(
      "DEV: webgl2_unavailable",
    );
    expect(getMapFailureDevelopmentLabel("constructor")).toBe(
      "DEV: constructor_error",
    );
    expect(getMapFailureDevelopmentLabel("style")).toBe("DEV: style_error");
    expect(getMapFailureDevelopmentLabel("startup-timeout")).toBe(
      "DEV: startup_timeout",
    );
  });

  it("detects WebGL2 support with an isolated probe", () => {
    expect(isWebGL2Supported(() => ({ context: "webgl2" }))).toBe(true);
  });

  it("handles unavailable or failing WebGL2 probes", () => {
    expect(isWebGL2Supported(() => null)).toBe(false);
    expect(
      isWebGL2Supported(() => {
        throw new Error("Context creation failed");
      }),
    ).toBe(false);
  });

  it("treats startup and GPU errors as fatal but ignores tile errors", () => {
    expect(
      getFatalMapErrorReason({ error: new Error("Style failed") }, false),
    ).toBe("style");
    expect(
      getFatalMapErrorReason(
        { error: new Error("Tile failed"), sourceId: "tiles" },
        false,
      ),
    ).toBeUndefined();
    expect(
      getFatalMapErrorReason(
        { error: { name: "GPUInitializationError" } },
        true,
      ),
    ).toBe("webgl2-unavailable");
  });

  it("logs only coarse diagnostics without error messages or coordinates", () => {
    const logger = vi.fn();
    reportMapInitializationFailure(
      "constructor",
      new Error("Failed near latitude 53.865 longitude 10.686"),
      { environment: "development", logger },
    );

    expect(logger).toHaveBeenCalledWith(
      "[CITYWALK map] Interactive map initialization failed.",
      { reason: "constructor", errorName: "Error" },
    );
    expect(JSON.stringify(logger.mock.calls)).not.toMatch(
      /latitude|longitude|53\.865|10\.686/,
    );
  });

  it("does not log diagnostics in production", () => {
    const logger = vi.fn();
    reportMapInitializationFailure("style", new Error("Style failed"), {
      environment: "production",
      logger,
    });
    expect(logger).not.toHaveBeenCalled();
  });
});
