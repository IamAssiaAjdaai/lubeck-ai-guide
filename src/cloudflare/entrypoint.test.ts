// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ client: vi.fn(), connect: vi.fn(), end: vi.fn(), db: vi.fn(), scope: vi.fn(), run: vi.fn(), fetch: vi.fn() }));
vi.mock("pg", () => ({ Client: class {
  constructor(options: unknown) { mocks.client(options); }
  connect = mocks.connect;
  end = mocks.end;
} }));
vi.mock("vinext/server/fetch-handler", () => ({ default: { fetch: mocks.fetch } }));
vi.mock("@/db/client", () => ({ createRequestDatabase: mocks.db, runWithRequestDatabase: mocks.scope }));
vi.mock("./accountErasureSchedule", () => ({ runScheduledAccountErasures: mocks.run }));
import worker from "./entrypoint";

const rcEnv = { COMMERCE_REVENUECAT_SECRET_API_KEY: "SENSITIVE-REVENUECAT-KEY", HYPERDRIVE: { connectionString: "postgres://SENSITIVE-DB-USER:SENSITIVE-DB-PASSWORD@private/db" } };
const appleEnv = {
  BETTER_AUTH_SECRET: "SENSITIVE-AUTH-SECRET", CITYWALK_APPLE_OAUTH_CLIENT_ID: "synthetic.service",
  CITYWALK_APPLE_TEAM_ID: "synthetic-team", CITYWALK_APPLE_KEY_ID: "synthetic-key",
  CITYWALK_APPLE_PRIVATE_KEY: "SENSITIVE-APPLE-KEY", CITYWALK_APPLE_APP_BUNDLE_IDENTIFIER: "synthetic.app",
};
const controller = { cron: "synthetic-unit-test", scheduledTime: 0 };
const context = {} as Parameters<typeof worker.scheduled>[2];
const counts = { claimed: 1, completed: 1, failed: 0, lostLeases: 0 };
let logs: ReturnType<typeof vi.spyOn>, errors: ReturnType<typeof vi.spyOn>, warnings: ReturnType<typeof vi.spyOn>;
const invoke = (env: unknown) => worker.scheduled(controller, env as Parameters<typeof worker.scheduled>[1], context);
function errorCodes() {
  return errors.mock.calls.map(([line]: unknown[]) => JSON.parse(String(line)).code);
}
function expectPrivateLogs() {
  const text = JSON.stringify([logs.mock.calls, errors.mock.calls, warnings.mock.calls]);
  expect(text).not.toMatch(/SENSITIVE|private\/db|raw-provider-body|user@example|access-token|refresh-token|stack-sentinel/);
}
beforeEach(() => {
  vi.resetAllMocks();
  logs = vi.spyOn(console, "log").mockImplementation(() => {});
  errors = vi.spyOn(console, "error").mockImplementation(() => {});
  warnings = vi.spyOn(console, "warn").mockImplementation(() => {});
  mocks.connect.mockResolvedValue(undefined);
  mocks.end.mockResolvedValue(undefined);
  mocks.db.mockReturnValue("scoped-db");
  mocks.scope.mockImplementation((_db, task) => task());
  mocks.run.mockResolvedValue({ status: "processed", ...counts, providers: { revenuecat: counts } });
});
afterEach(() => { expectPrivateLogs(); vi.restoreAllMocks(); });

describe("Cloudflare scheduled entrypoint (no network or provider clients)", () => {
  it("reports missing configuration without constructing or connecting a database", async () => {
    await invoke({ HYPERDRIVE: rcEnv.HYPERDRIVE, ...appleEnv, CITYWALK_APPLE_PRIVATE_KEY: "" });
    expect(mocks.client).not.toHaveBeenCalled();
    expect(mocks.run).not.toHaveBeenCalled();
    expect(errorCodes()).toEqual(["ACCOUNT_ERASURE_SCHEDULE_NOT_CONFIGURED"]);
  });
  it("uses the request-scoped database, reports provider counts and closes it", async () => {
    await invoke(rcEnv);
    expect(mocks.client).toHaveBeenCalledWith({ connectionString: rcEnv.HYPERDRIVE.connectionString, connectionTimeoutMillis: 10_000 });
    expect(mocks.connect).toHaveBeenCalledOnce();
    expect(mocks.db).toHaveBeenCalledOnce();
    expect(mocks.scope).toHaveBeenCalledWith("scoped-db", expect.any(Function));
    expect(mocks.run).toHaveBeenCalledWith(rcEnv);
    expect(mocks.end).toHaveBeenCalledOnce();
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(logs.mock.calls).toContainEqual(["CITYWALK_ACCOUNT_ERASURE_PROVIDER_PROCESSED provider=revenuecat claimed=1 completed=1 failed=0 lostLeases=0"]);
    expect(errorCodes()).toEqual(["ACCOUNT_ERASURE_PROVIDERS_UNAVAILABLE"]);
  });
  it("reports healthy all-provider processing without a failure event", async () => {
    mocks.run.mockResolvedValue({ status: "processed", claimed: 2, completed: 2, failed: 0, lostLeases: 0,
      providers: { apple: counts, revenuecat: counts } });
    await invoke({ ...rcEnv, ...appleEnv });
    expect(errors).not.toHaveBeenCalled();
    expect(logs.mock.calls).toContainEqual(["CITYWALK_ACCOUNT_ERASURE_SCHEDULE_PROCESSED claimed=2 completed=2 failed=0 lostLeases=0"]);
  });
  it.each(["apple", "revenuecat"])("emits an actionable event for %s failures and lost leases", async provider => {
    const failed = { claimed: 2, completed: 0, failed: 1, lostLeases: 1 };
    mocks.run.mockResolvedValue({ status: "processed", ...failed, providers: { [provider]: failed } });
    await invoke({ ...rcEnv, ...appleEnv });
    expect(errorCodes()).toEqual([provider === "apple" ? "ACCOUNT_ERASURE_APPLE_FAILED" : "ACCOUNT_ERASURE_REVENUECAT_FAILED", "ACCOUNT_ERASURE_LEASE_LOST"]);
    expect(mocks.end).toHaveBeenCalledOnce();
  });
  it.each(["construction", "connection", "database scope", "processing"])("sanitizes %s failure, rejects the invocation, and cleans up when constructed", async phase => {
    const failure = new Error("SENSITIVE access-token raw-provider-body user@example stack-sentinel");
    if (phase === "construction") mocks.client.mockImplementation(() => { throw failure; });
    if (phase === "connection") mocks.connect.mockRejectedValue(failure);
    if (phase === "database scope") mocks.scope.mockImplementation(() => { throw failure; });
    if (phase === "processing") mocks.run.mockRejectedValue(failure);
    await expect(invoke({ ...rcEnv, ...appleEnv })).rejects.toThrow(/^CITYWALK_ACCOUNT_ERASURE_SCHEDULE_FAILED$/);
    expect(errorCodes()).toContain("ACCOUNT_ERASURE_SCHEDULE_FAILED");
    expect(mocks.end).toHaveBeenCalledTimes(phase === "construction" ? 0 : 1);
  });
  it("sanitizes a missing Hyperdrive binding as a failed invocation", async () => {
    await expect(invoke({ ...appleEnv })).rejects.toThrow(/^CITYWALK_ACCOUNT_ERASURE_SCHEDULE_FAILED$/);
    expect(errorCodes()).toContain("ACCOUNT_ERASURE_SCHEDULE_FAILED");
    expect(mocks.end).not.toHaveBeenCalled();
  });
  it.each([false, true])("observes cleanup failure without changing recorded outcomes (synchronous=%s)", async synchronous => {
    if (synchronous) mocks.end.mockImplementation(() => { throw new Error("SENSITIVE-DB-PASSWORD"); });
    else mocks.end.mockRejectedValue(new Error("SENSITIVE-DB-PASSWORD"));
    await invoke(rcEnv);
    expect(errorCodes()).toContain("ACCOUNT_ERASURE_DATABASE_CLOSE_FAILED");
    expect(mocks.run).toHaveBeenCalledOnce();
  });
  it("closes the client if orchestration unexpectedly reports a configuration skip", async () => {
    mocks.run.mockResolvedValue({ status: "skipped_not_configured" });
    await invoke({ ...rcEnv, ...appleEnv });
    expect(errorCodes()).toEqual(["ACCOUNT_ERASURE_SCHEDULE_NOT_CONFIGURED"]);
    expect(mocks.end).toHaveBeenCalledOnce();
  });
});
