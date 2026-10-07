// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOperationalHealth: vi.fn(),
}));

vi.mock("@/lib/operations/health.server", () => ({
  getOperationalHealth: mocks.getOperationalHealth,
}));

import { GET } from "./route";

describe("operational health API", () => {
  beforeEach(() => {
    mocks.getOperationalHealth.mockReset();
  });

  it("returns a non-cacheable 200 readiness response", async () => {
    mocks.getOperationalHealth.mockResolvedValue({
      service: "citywalk",
      status: "ok",
      environment: "production",
      release: "abc123",
      checkedAt: "2026-10-07T14:00:00.000Z",
      checks: {
        database: "ok",
        authConfiguration: "ok",
        mediaConfiguration: "ok",
        emailConfiguration: "ok",
        aiConfiguration: "ok",
      },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("retry-after")).toBeNull();
    expect(await response.json()).toMatchObject({
      service: "citywalk",
      status: "ok",
      checks: { database: "ok" },
    });
  });

  it("returns 503 with retry guidance when readiness is degraded", async () => {
    mocks.getOperationalHealth.mockResolvedValue({
      service: "citywalk",
      status: "degraded",
      environment: "production",
      release: "abc123",
      checkedAt: "2026-10-07T14:00:00.000Z",
      checks: {
        database: "error",
        authConfiguration: "ok",
        mediaConfiguration: "ok",
        emailConfiguration: "ok",
        aiConfiguration: "ok",
      },
    });

    const response = await GET();

    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("30");
    expect(await response.json()).toMatchObject({
      status: "degraded",
      checks: { database: "error" },
    });
  });
});
