import { describe, expect, it } from "vitest";

import { resolveApiOrigin } from "../src/lib/api/environment";

describe("mobile API origin", () => {
  it("uses a local development default", () => {
    expect(resolveApiOrigin({ environment: "development" })).toBe("http://localhost:3000");
  });

  it("accepts a LAN origin only for development", () => {
    expect(resolveApiOrigin({ environment: "development", configuredOrigin: "http://192.168.1.20:3000" }))
      .toBe("http://192.168.1.20:3000");
    expect(() => resolveApiOrigin({ environment: "production", configuredOrigin: "https://192.168.1.20" }))
      .toThrow("cannot target a local host");
  });

  it("accepts only HTTPS Vercel hosts in preview", () => {
    expect(resolveApiOrigin({ environment: "preview", configuredOrigin: "https://citywalk-feature.vercel.app" }))
      .toBe("https://citywalk-feature.vercel.app");
    expect(() => resolveApiOrigin({ environment: "preview", configuredOrigin: "https://example.com" }))
      .toThrow("Vercel Preview");
  });

  it("requires a fixed HTTPS production build origin", () => {
    expect(resolveApiOrigin({ environment: "production", configuredOrigin: "https://citywalk.example" }))
      .toBe("https://citywalk.example");
    expect(resolveApiOrigin({ environment: "production", configuredOrigin: "https://fcitywalk.example" }))
      .toBe("https://fcitywalk.example");
    expect(() => resolveApiOrigin({ environment: "production", configuredOrigin: "http://citywalk.example" }))
      .toThrow("must use HTTPS");
  });

  it.each([
    "https://localhost.",
    "https://app.local",
    "https://127.0.0.2",
    "https://169.254.10.4",
    "https://10.0.0.2",
    "https://172.31.2.3",
    "https://192.168.1.20",
    "https://[::1]",
    "https://[fd00::1]",
    "https://[fe80::1]",
  ])("rejects local or private production origin %s", (origin) => {
    expect(() => resolveApiOrigin({ environment: "production", configuredOrigin: origin }))
      .toThrow("cannot target a local host");
  });

  it("rejects origins containing paths, credentials, query strings, or fragments", () => {
    for (const origin of [
      "https://user:secret@citywalk.example",
      "https://citywalk.example/api",
      "https://citywalk.example?target=other",
      "https://citywalk.example#other",
    ]) {
      expect(() => resolveApiOrigin({ environment: "production", configuredOrigin: origin }))
        .toThrow("only scheme and host");
    }
  });
});
