import { describe, expect, it, vi } from "vitest";
import { createPreviewTesterReadClient } from "../src/lib/previewTesterApi";

describe("Android Preview tester API", () => {
  function setup(status = 200) {
    const fetchImpl = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) =>
        new Response(
          status === 200 ? JSON.stringify({ cities: [] }) : null,
          { status },
        ),
    );

    const clearToken = vi.fn();

    const client = createPreviewTesterReadClient({
      environment: "preview",
      configuredOrigin: "https://api-preview.getcitywalk.com",
      getToken: () => "aaa.bbb.ccc",
      clearToken,
      fetchImpl,
    });

    return { client, fetchImpl, clearToken };
  }

  it("sends the tester JWT only to the pinned Preview API", async () => {
    const { client, fetchImpl } = setup();

    await expect(client.getCities("de"))
      .resolves.toEqual({ cities: [] });

    const [url, init] = fetchImpl.mock.calls[0]!;
    const headers = new Headers(init?.headers);

    expect(String(url)).toBe(
      "https://api-preview.getcitywalk.com/api/content/cities?locale=de"
    );
    expect(headers.get("X-Citywalk-Tester-Token"))
      .toBe("aaa.bbb.ccc");
    expect(headers.has("Authorization")).toBe(false);
    expect(headers.has("Cookie")).toBe(false);
    expect(init?.method).toBe("GET");
    expect(init?.credentials).toBe("omit");
    expect(init?.redirect).toBe("error");
  });

  it("clears the token on 401", async () => {
    const { client, clearToken } = setup(401);

    await expect(client.getCities("de"))
      .rejects.toThrow("authentication expired");

    expect(clearToken).toHaveBeenCalledOnce();
  });

  it("recognizes the locked Preview API", async () => {
    const { client } = setup(503);

    await expect(client.getCities("de"))
      .rejects.toThrow("locked or unavailable");
  });

  it("rejects redirects", async () => {
    const { client } = setup(302);

    await expect(client.getCities("de"))
      .rejects.toThrow("redirects are not permitted");
  });

  it("rejects missing tester login without a request", async () => {
    const { fetchImpl } = setup();

    const client = createPreviewTesterReadClient({
      environment: "preview",
      configuredOrigin: "https://api-preview.getcitywalk.com",
      getToken: () => null,
      clearToken: vi.fn(),
      fetchImpl,
    });

    await expect(client.getCities("de"))
      .rejects.toThrow("login required");

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fails closed in production", async () => {
    const { fetchImpl } = setup();

    const client = createPreviewTesterReadClient({
      environment: "production",
      configuredOrigin: "https://getcitywalk.com",
      getToken: () => "aaa.bbb.ccc",
      clearToken: vi.fn(),
      fetchImpl,
    });

    await expect(client.getCities("de"))
      .rejects.toThrow("disabled");

    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
