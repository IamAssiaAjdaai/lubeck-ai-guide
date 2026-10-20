import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createRevenueCatCustomerEraser,
  RevenueCatCustomerErasureError,
} from "./revenueCatCustomerErasure.server";

describe("RevenueCat customer erasure", () => {
  it("uses the immutable user id and secret server credential", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    const eraser = createRevenueCatCustomerEraser({ apiKey: "secret-key", fetchImpl });

    await expect(eraser.erase({ userId: "user/123" })).resolves.toBe("erased");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.revenuecat.com/v1/subscribers/user%2F123",
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({ Authorization: "Bearer secret-key" }),
      }),
    );
  });

  it("bounds provider requests and replaces network/timeout details with a fixed code", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("Bearer secret-key user/123 private-provider-body"));
    const eraser = createRevenueCatCustomerEraser({ apiKey: "secret-key", fetchImpl });
    await expect(eraser.erase({ userId: "user/123" })).rejects.toMatchObject({ code: "REQUEST_FAILED", message: "REQUEST_FAILED" });
    expect(fetchImpl.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it("treats not-found as terminal success for retry-safe deletion", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
    const eraser = createRevenueCatCustomerEraser({ apiKey: "secret-key", fetchImpl });
    await expect(eraser.erase({ userId: "missing-user" })).resolves.toBe("not_found");
  });

  it("rejects missing configuration and non-terminal provider responses", async () => {
    const unconfigured = createRevenueCatCustomerEraser({ apiKey: "", fetchImpl: vi.fn() });
    await expect(unconfigured.erase({ userId: "user-1" })).rejects.toEqual(
      expect.objectContaining<Partial<RevenueCatCustomerErasureError>>({ code: "NOT_CONFIGURED" }),
    );

    const unavailable = createRevenueCatCustomerEraser({
      apiKey: "secret-key",
      fetchImpl: vi.fn().mockResolvedValue(new Response(null, { status: 503 })),
    });
    await expect(unavailable.erase({ userId: "user-1" })).rejects.toEqual(
      expect.objectContaining<Partial<RevenueCatCustomerErasureError>>({ code: "REQUEST_FAILED" }),
    );
  });
});
