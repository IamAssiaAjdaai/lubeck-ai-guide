import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

import {
  NATIVE_VISITOR_RETENTION_MS,
  NATIVE_VISITOR_STORAGE_KEY,
  isNativeVisitorId,
  resetNativeVisitorIdentityForTests,
  resolveNativeVisitorId,
} from "../src/lib/visitorIdentity";

const FIRST_ID = "123e4567-e89b-42d3-a456-426614174000";
const SECOND_ID = "7f1f9f32-3f5d-4ec2-bb20-a7ef7ff19022";

function createStorage(initial?: string) {
  const values = new Map<string, string>();
  if (initial) values.set(NATIVE_VISITOR_STORAGE_KEY, initial);
  return {
    getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { values.set(key, value); }),
    removeItem: vi.fn(async (key: string) => { values.delete(key); }),
  };
}

describe("native anonymous visitor identity", () => {
  beforeEach(() => resetNativeVisitorIdentityForTests());

  it("persists one valid pseudonymous UUID across storage reloads", async () => {
    const storage = createStorage();
    await expect(resolveNativeVisitorId({ storage, now: 100, createId: () => FIRST_ID }))
      .resolves.toBe(FIRST_ID);
    await expect(resolveNativeVisitorId({ storage, now: 200, createId: () => SECOND_ID }))
      .resolves.toBe(FIRST_ID);
    expect(isNativeVisitorId(FIRST_ID)).toBe(true);
    expect(storage.setItem).toHaveBeenLastCalledWith(
      NATIVE_VISITOR_STORAGE_KEY,
      JSON.stringify({ version: 1, id: FIRST_ID, expiresAt: 100 + NATIVE_VISITOR_RETENTION_MS }),
    );
  });

  it("rotates malformed or expired persisted identities", async () => {
    const malformed = createStorage(JSON.stringify({ version: 1, id: "not-a-uuid", expiresAt: 999 }));
    await expect(resolveNativeVisitorId({ storage: malformed, now: 1, createId: () => SECOND_ID }))
      .resolves.toBe(SECOND_ID);

    const expired = createStorage(JSON.stringify({ version: 1, id: FIRST_ID, expiresAt: 10 }));
    await expect(resolveNativeVisitorId({ storage: expired, now: 11, createId: () => SECOND_ID }))
      .resolves.toBe(SECOND_ID);
  });

  it("falls back to one process-stable identity when storage is unavailable", async () => {
    const storage = {
      getItem: vi.fn(async () => { throw new Error("unavailable"); }),
      setItem: vi.fn(async () => { throw new Error("unavailable"); }),
      removeItem: vi.fn(async () => undefined),
    };
    await expect(resolveNativeVisitorId({ storage, now: 1, createId: () => FIRST_ID }))
      .resolves.toBe(FIRST_ID);
    await expect(resolveNativeVisitorId({ storage, now: 2, createId: () => SECOND_ID }))
      .resolves.toBe(FIRST_ID);
  });
});
