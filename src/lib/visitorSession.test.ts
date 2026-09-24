import { beforeEach, describe, expect, it } from "vitest";

import {
  ANONYMOUS_VISITOR_RETENTION_MS,
  ANONYMOUS_VISITOR_STORAGE_KEY,
  resolveVisitorSessionIdentity,
  VISITOR_SESSION_RETENTION_MS,
  VISITOR_SESSION_STORAGE_KEY,
} from "@/lib/visitorSession";

const IDS = [
  "00000000-0000-4000-8000-000000000001",
  "00000000-0000-4000-8000-000000000002",
  "00000000-0000-4000-8000-000000000003",
  "00000000-0000-4000-8000-000000000004",
] as const;

function createIdFactory() {
  let index = 0;
  return () => IDS[index++] ?? IDS[IDS.length - 1];
}

describe("anonymous visitor sessions", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("reuses the anonymous visitor and browser session while both are valid", () => {
    const createId = createIdFactory();

    const first = resolveVisitorSessionIdentity({
      persistentStorage: localStorage,
      sessionStorage,
      now: 1_000,
      createId,
    });
    const second = resolveVisitorSessionIdentity({
      persistentStorage: localStorage,
      sessionStorage,
      now: 2_000,
      createId,
    });

    expect(first).toEqual({
      visitorId: IDS[0],
      sessionId: IDS[1],
    });
    expect(second).toEqual(first);
  });

  it("rotates an expired session while keeping the longer-lived visitor", () => {
    const createId = createIdFactory();

    const first = resolveVisitorSessionIdentity({
      persistentStorage: localStorage,
      sessionStorage,
      now: 1_000,
      createId,
    });
    const second = resolveVisitorSessionIdentity({
      persistentStorage: localStorage,
      sessionStorage,
      now: 1_000 + VISITOR_SESSION_RETENTION_MS + 1,
      createId,
    });

    expect(second.visitorId).toBe(first.visitorId);
    expect(second.sessionId).toBe(IDS[2]);
  });

  it("rotates both identities when the visitor retention window expires", () => {
    const createId = createIdFactory();

    resolveVisitorSessionIdentity({
      persistentStorage: localStorage,
      sessionStorage,
      now: 1_000,
      createId,
    });
    const next = resolveVisitorSessionIdentity({
      persistentStorage: localStorage,
      sessionStorage,
      now: 1_000 + ANONYMOUS_VISITOR_RETENTION_MS + 1,
      createId,
    });

    expect(next).toEqual({
      visitorId: IDS[2],
      sessionId: IDS[3],
    });
  });

  it("stores only pseudonymous identity and expiry metadata, never location data", () => {
    const createId = createIdFactory();

    resolveVisitorSessionIdentity({
      persistentStorage: localStorage,
      sessionStorage,
      now: 1_000,
      createId,
    });

    const visitor = JSON.parse(
      localStorage.getItem(ANONYMOUS_VISITOR_STORAGE_KEY) ?? "{}",
    );
    const session = JSON.parse(
      sessionStorage.getItem(VISITOR_SESSION_STORAGE_KEY) ?? "{}",
    );

    expect(Object.keys(visitor).sort()).toEqual(["expiresAt", "id", "version"]);
    expect(Object.keys(session).sort()).toEqual([
      "expiresAt",
      "id",
      "version",
      "visitorId",
    ]);
    expect(JSON.stringify({ visitor, session })).not.toMatch(
      /latitude|longitude|coordinates|gps/i,
    );
  });

  it("recovers from malformed stored values without breaking the guest journey", () => {
    localStorage.setItem(ANONYMOUS_VISITOR_STORAGE_KEY, "not-json");
    sessionStorage.setItem(VISITOR_SESSION_STORAGE_KEY, "not-json");

    const identity = resolveVisitorSessionIdentity({
      persistentStorage: localStorage,
      sessionStorage,
      now: 1_000,
      createId: createIdFactory(),
    });

    expect(identity).toEqual({
      visitorId: IDS[0],
      sessionId: IDS[1],
    });
  });
});
