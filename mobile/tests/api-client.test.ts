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

  it("loads guide eligibility from the server-owned boundary", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ eligible: true })));
    const client = createCitywalkApiClient({ origin: "https://citywalk.example", fetchImpl });

    await expect(client.getGuideEligibility("lubeck", "holstentor"))
      .resolves.toEqual({ eligible: true });
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL("https://citywalk.example/api/guide/eligibility?citySlug=lubeck&placeSlug=holstentor"),
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
  });

  it("posts one native question through the existing guide API with an optional auth cookie", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      answer: "The gate was completed in 1478.",
      sources: [{
        label: "Official source", url: "https://example.com/source",
        verifiedAt: "2026-09-13", citySlug: "lubeck", placeSlug: "holstentor",
        chunkIds: ["holstentor-history"],
      }],
    })));
    const client = createCitywalkApiClient({
      origin: "https://citywalk.example",
      fetchImpl,
      getAuthCookie: async () => "better-auth.session_token=opaque",
    });

    await expect(client.askGuide({
      citySlug: "lubeck", placeSlug: "holstentor", locale: "en",
      question: "When was this built?",
    })).resolves.toMatchObject({ answer: "The gate was completed in 1478." });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toEqual(new URL("https://citywalk.example/api/guide"));
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Cookie"))
      .toBe("better-auth.session_token=opaque");
    expect(init?.body).toBe(JSON.stringify({
      citySlug: "lubeck", placeSlug: "holstentor", locale: "en",
      question: "When was this built?",
    }));
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
