import { describe, expect, it, vi } from "vitest";

import { createCitywalkApiClient } from "../src/lib/api/client";

const cityResponse = {
  city: {
    slug: "lubeck", requestedLocale: "en", resolvedLocale: "en", didFallback: false,
    content: { name: "Lübeck" }, media: [],
  },
  places: [{
    slug: "holstentor", category: "see", coordinates: { lat: 53.866, lng: 10.68 },
    durationMinutes: 20, requestedLocale: "en", resolvedLocale: "en", didFallback: false,
    content: { name: "Holstentor", shortDescription: "Historic gate" }, media: [],
  }],
  tours: [],
};

describe("CITYWALK native API client", () => {
  it("loads and validates the existing generic city endpoint", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify(cityResponse)));
    const client = createCitywalkApiClient({ origin: "https://citywalk.example", fetchImpl });
    await expect(client.getCity("lubeck", "en")).resolves.toMatchObject({ city: { slug: "lubeck" } });
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL("https://citywalk.example/api/content/cities/lubeck?locale=en"),
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
  });

  it("adds the SecureStore-managed Better Auth cookie only to authenticated requests", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(null, { status: 204 }));
    const client = createCitywalkApiClient({
      origin: "https://citywalk.example",
      fetchImpl,
      getAuthCookie: async () => "better-auth.session_token=opaque",
    });
    await client.fetchAuthenticated("/api/account/example");
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toEqual(new URL("https://citywalk.example/api/account/example"));
    expect(init?.credentials).toBe("omit");
    expect(new Headers(init?.headers).get("Cookie")).toBe("better-auth.session_token=opaque");
  });

  it("awaits the native cookie provider before sending an authenticated request", async () => {
    let resolveCookie!: (value: string) => void;
    const cookie = new Promise<string>((resolve) => { resolveCookie = resolve; });
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(null, { status: 204 }));
    const client = createCitywalkApiClient({
      origin: "https://citywalk.example",
      fetchImpl,
      getAuthCookie: () => cookie,
    });

    const request = client.fetchAuthenticated("/api/account/example");
    expect(fetchImpl).not.toHaveBeenCalled();
    resolveCookie("better-auth.session_token=opaque");
    await request;

    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("forwards an expired or absent native session as a cookie-free server request", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(null, { status: 401 }));
    const client = createCitywalkApiClient({
      origin: "https://citywalk.example",
      fetchImpl,
      getAuthCookie: async () => "",
    });

    const response = await client.fetchAuthenticated("/api/account/example", {
      credentials: "include",
      headers: { Cookie: "caller-controlled=value" },
    });
    const [, init] = fetchImpl.mock.calls[0]!;

    expect(response.status).toBe(401);
    expect(init?.credentials).toBe("omit");
    expect(new Headers(init?.headers).has("Cookie")).toBe(false);
  });

  it("never forwards the native cookie to an absolute or protocol-relative URL", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(null, { status: 204 }));
    const getAuthCookie = vi.fn(async () => "better-auth.session_token=opaque");
    const client = createCitywalkApiClient({
      origin: "https://citywalk.example",
      fetchImpl,
      getAuthCookie,
    });

    await expect(client.fetchAuthenticated("https://attacker.example/collect"))
      .rejects.toThrow("relative server path");
    await expect(client.fetchAuthenticated("//attacker.example/collect"))
      .rejects.toThrow("relative server path");
    expect(getAuthCookie).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("keeps public guest requests cookie-free", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify(cityResponse)));
    const getAuthCookie = vi.fn(async () => "better-auth.session_token=opaque");
    const client = createCitywalkApiClient({
      origin: "https://citywalk.example",
      fetchImpl,
      getAuthCookie,
    });

    await client.getCity("lubeck", "en");
    const [, init] = fetchImpl.mock.calls[0]!;

    expect(getAuthCookie).not.toHaveBeenCalled();
    expect(new Headers(init?.headers).has("Cookie")).toBe(false);
  });

  it("fails closed when an authenticated request has no native session provider", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(null, { status: 204 }));
    const client = createCitywalkApiClient({
      origin: "https://citywalk.example",
      fetchImpl,
    });

    await expect(client.fetchAuthenticated("/api/account/example"))
      .rejects.toThrow("not configured");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("does not expose or persist a token in the API client contract", () => {
    const client = createCitywalkApiClient({ origin: "https://citywalk.example" });
    expect(Object.keys(client)).not.toContain("token");
    expect(Object.keys(client)).not.toContain("cookie");
  });
});
