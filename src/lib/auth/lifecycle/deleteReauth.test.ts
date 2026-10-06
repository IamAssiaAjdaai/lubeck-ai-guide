import { describe, expect, it } from "vitest";
import { hasFreshSocialDeleteSession, SOCIAL_DELETE_FRESH_AGE_MS } from "./deleteReauth";

describe("hasFreshSocialDeleteSession", () => {
  const now = new Date("2026-10-06T08:00:00.000Z");

  it("allows a linked social account with a fresh session", () => {
    expect(hasFreshSocialDeleteSession({
      hasSocialProvider: true,
      sessionCreatedAt: new Date(now.getTime() - SOCIAL_DELETE_FRESH_AGE_MS + 1),
      now,
    })).toBe(true);
  });

  it("rejects a stale social session", () => {
    expect(hasFreshSocialDeleteSession({
      hasSocialProvider: true,
      sessionCreatedAt: new Date(now.getTime() - SOCIAL_DELETE_FRESH_AGE_MS - 1),
      now,
    })).toBe(false);
  });

  it("rejects a fresh session without a linked social provider", () => {
    expect(hasFreshSocialDeleteSession({
      hasSocialProvider: false,
      sessionCreatedAt: now,
      now,
    })).toBe(false);
  });
});
