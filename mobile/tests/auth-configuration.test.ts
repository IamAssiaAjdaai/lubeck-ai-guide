import { describe, expect, it } from "vitest";

import { getNativeAuthConfiguration } from "../src/lib/auth/configuration";

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
});
