// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  build: vi.fn(),
}));

vi.mock("@/lib/auth/server", () => ({
  getAuth: () => ({ api: { getSession: mocks.getSession } }),
}));

vi.mock("@/lib/account/dataExport.server", () => {
  class AccountDataExportError extends Error {
    constructor(readonly status: number) {
      super("Account data export unavailable.");
    }
  }
  return {
    AccountDataExportError,
    buildAccountDataExport: mocks.build,
  };
});

import { GET } from "./route";

const origin = "https://citywalk.example.test";
const owner = "user-export-owner";
const request = (headers: Record<string, string> = {}) =>
  new Request(`${origin}/api/account/export`, {
    headers: {
      Origin: origin,
      Host: "citywalk.example.test",
      "X-Citywalk-Account": owner,
      ...headers,
    },
  });

describe("account data export route", () => {
  beforeEach(() => {
    mocks.getSession.mockReset().mockResolvedValue({
      user: { id: owner },
      session: { id: "session-id" },
    });
    mocks.build.mockReset().mockResolvedValue({
      format: "citywalk-account-data",
      version: 1,
      generatedAt: "2026-10-07T00:00:00.000Z",
      account: { id: owner },
    });
  });

  it("rejects cross-origin requests before reading account data", async () => {
    const response = await GET(request({ Origin: "https://evil.example.test" }));
    expect(response.status).toBe(403);
    expect(mocks.build).not.toHaveBeenCalled();
  });

  it("requires an authenticated matching account header", async () => {
    mocks.getSession.mockResolvedValueOnce(null);
    expect((await GET(request())).status).toBe(401);

    mocks.getSession.mockResolvedValueOnce({ user: { id: owner }, session: { id: "session-id" } });
    expect((await GET(request({ "X-Citywalk-Account": "different-user" }))).status).toBe(401);
    expect(mocks.build).not.toHaveBeenCalled();
  });

  it("returns a private no-store JSON attachment for the authenticated owner", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="citywalk-data-export-2026-10-07.json"',
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(mocks.build).toHaveBeenCalledWith(owner);
    expect(await response.json()).toMatchObject({
      format: "citywalk-account-data",
      version: 1,
      account: { id: owner },
    });
  });

  it("does not expose internal failures", async () => {
    mocks.build.mockRejectedValueOnce(new Error("database details must stay private"));
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Data export is temporarily unavailable." });
  });
});
