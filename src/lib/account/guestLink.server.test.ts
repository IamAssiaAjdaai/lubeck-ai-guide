import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parseGuestLinkInput } from "@/lib/account/guestLink.server";

describe("traveler guest link input", () => {
  it("accepts only pseudonymous visitor/session IDs with a supported locale", () => {
    expect(
      parseGuestLinkInput({
        visitorId: "00000000-0000-4000-8000-000000000001",
        sessionId: "00000000-0000-4000-8000-000000000002",
        preferredLocale: "ar",
      }),
    ).toEqual({
      visitorId: "00000000-0000-4000-8000-000000000001",
      sessionId: "00000000-0000-4000-8000-000000000002",
      preferredLocale: "ar",
    });
  });

  it("rejects malformed identifiers, unsupported locales, and location-shaped payloads", () => {
    expect(
      parseGuestLinkInput({
        visitorId: "not-a-uuid",
        sessionId: "00000000-0000-4000-8000-000000000002",
        preferredLocale: "en",
      }),
    ).toBeUndefined();

    expect(
      parseGuestLinkInput({
        visitorId: "00000000-0000-4000-8000-000000000001",
        sessionId: "00000000-0000-4000-8000-000000000002",
        preferredLocale: "xx",
      }),
    ).toBeUndefined();

    const accepted = parseGuestLinkInput({
      visitorId: "00000000-0000-4000-8000-000000000001",
      sessionId: "00000000-0000-4000-8000-000000000002",
      preferredLocale: "en",
      latitude: 53.86,
      longitude: 10.68,
    });

    expect(accepted).toEqual({
      visitorId: "00000000-0000-4000-8000-000000000001",
      sessionId: "00000000-0000-4000-8000-000000000002",
      preferredLocale: "en",
    });
    expect(JSON.stringify(accepted)).not.toMatch(/latitude|longitude|gps/i);
  });
});
