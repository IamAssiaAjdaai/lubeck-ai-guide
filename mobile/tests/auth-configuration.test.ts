import { describe, expect, it } from "vitest";

import {
  getNativeAuthConfiguration,
  getNativeSocialAuthAvailability,
} from "../src/lib/auth/configuration";

describe("Better Auth native boundary", () => {
  it("uses the CITYWALK scheme and server origin", () => {
    expect(getNativeAuthConfiguration("https://citywalk.example")).toEqual({
      baseURL: "https://citywalk.example",
      scheme: "citywalk",
      storagePrefix: "citywalk-auth",
      callbackURL: "citywalk://account",
    });
  });

  it("does not include raw tokens or server secrets", () => {
    const serialized = JSON.stringify(getNativeAuthConfiguration("https://citywalk.example"));
    expect(serialized).not.toMatch(/token|secret|password/i);
  });

  it("keeps Google and Apple buttons opt-in at build time", () => {
    expect(getNativeSocialAuthAvailability({})).toEqual({
      google: false,
      apple: false,
    });
    expect(
      getNativeSocialAuthAvailability({ google: "1", apple: "1" }),
    ).toEqual({
      google: true,
      apple: true,
    });
    expect(
      getNativeSocialAuthAvailability({ google: "true", apple: "yes" }),
    ).toEqual({
      google: false,
      apple: false,
    });
  });
});
