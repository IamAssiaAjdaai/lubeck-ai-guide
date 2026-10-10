import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getTrustedGuideAbuseIdentifier } from "./guideRequestIdentity.server";

describe("trusted Cloudflare guide request identity", () => {
  it("accepts a validated Cloudflare IPv4 address only in the Worker runtime", () => {
    const headers = new Headers({
      "cf-connecting-ip": "203.0.113.20",
      "x-forwarded-for": "192.0.2.99",
    });

    expect(getTrustedGuideAbuseIdentifier(headers, "hyperdrive")).toBe("cloudflare:203.0.113.20");
    expect(getTrustedGuideAbuseIdentifier(headers, "local")).toBe("unattributed");
    expect(getTrustedGuideAbuseIdentifier(headers, "development")).toBe("unattributed");
  });

  it("accepts IPv6 and never uses X-Forwarded-For or X-Real-IP", () => {
    const headers = new Headers({
      "cf-connecting-ip": "2001:DB8::1",
      "x-forwarded-for": "198.51.100.4, 198.51.100.5",
      "x-real-ip": "198.51.100.6",
    });
    expect(getTrustedGuideAbuseIdentifier(headers, "hyperdrive")).toBe("cloudflare:2001:db8::1");
  });

  it.each([
    "",
    "198.51.100.1, 203.0.113.10",
    "unknown",
    "not-an-ip",
    "999.999.999.999",
    "127.0.0.1:8080",
  ])("fails closed for absent or malformed edge addresses (%s)", (candidate) => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.20" });
    if (candidate) {
      // A malformed value is untrusted even if another header looks plausible.
      headers.set("cf-connecting-ip", candidate);
    }
    expect(getTrustedGuideAbuseIdentifier(headers, "hyperdrive")).toBe("unattributed");
  });

  it("ignores a caller-forged edge header outside Cloudflare", () => {
    const headers = new Headers({
      "cf-connecting-ip": "198.51.100.8",
      "x-forwarded-for": "198.51.100.9",
    });
    expect(getTrustedGuideAbuseIdentifier(headers, "preview")).toBe("unattributed");
  });
});
