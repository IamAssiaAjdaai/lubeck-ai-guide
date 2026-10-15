// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ pool: vi.fn(), end: vi.fn(async () => undefined), drizzle: vi.fn((client: unknown) => ({ client })) }));
vi.mock("pg", () => ({
  Client: class {},
  Pool: class { constructor(options: unknown) { mocks.pool(options); } end = mocks.end; },
}));
vi.mock("drizzle-orm/node-postgres", () => ({ drizzle: mocks.drizzle }));
import { Client } from "pg";
import { closeDb, createRequestDatabase, getDb, runWithRequestDatabase } from "./client";

beforeEach(async () => { await closeDb(); vi.clearAllMocks(); });
afterEach(async () => { await closeDb(); vi.unstubAllEnvs(); });
describe("Hyperdrive and DATABASE_URL compatibility boundary", () => {
  it("serves scoped Worker database access without DATABASE_URL", async () => {
    vi.stubEnv("CITYWALK_DATABASE_RUNTIME", "hyperdrive"); vi.stubEnv("DATABASE_URL", "");
    const db = createRequestDatabase(new Client());
    await runWithRequestDatabase(db, async () => { await Promise.resolve(); expect(getDb()).toBe(db); });
    expect(mocks.pool).not.toHaveBeenCalled();
  });
  it("fails closed outside a Hyperdrive scope even with the legacy URL present", () => {
    vi.stubEnv("CITYWALK_DATABASE_RUNTIME", "hyperdrive"); vi.stubEnv("DATABASE_URL", "synthetic-legacy-url");
    expect(() => getDb()).toThrow("requires a request-scoped database client");
    expect(mocks.pool).not.toHaveBeenCalled();
  });
  it("retains the Node fallback used by auth bootstrap and operator commands", () => {
    vi.stubEnv("CITYWALK_DATABASE_RUNTIME", ""); vi.stubEnv("DATABASE_URL", "synthetic-node-url");
    getDb(); expect(mocks.pool).toHaveBeenCalledWith({ connectionString: "synthetic-node-url" });
  });
  it("rejects missing DATABASE_URL in the non-Worker compatibility path", () => {
    vi.stubEnv("CITYWALK_DATABASE_RUNTIME", ""); vi.stubEnv("DATABASE_URL", "");
    expect(() => getDb()).toThrow("DATABASE_URL is not configured");
  });
});
