import { describe, expect, it, vi } from "vitest";

import { CitywalkApiError, createCitywalkApiClient } from "../src/lib/api/client";

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

const citySummaryResponse = cityResponse;
const placeResponse = { city: cityResponse.city, place: cityResponse.places[0] };

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

  it("loads the compact city contract with ETag revalidation and no credentials", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify(citySummaryResponse), { headers: { ETag: '"city-v1"' } }));
    const client = createCitywalkApiClient({ origin: "https://citywalk.example", fetchImpl });

    await expect(client.loadCitySummary("hamburg", "de", '"city-v0"'))
      .resolves.toMatchObject({ status: 200, etag: '"city-v1"' });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toEqual(new URL(
      "https://citywalk.example/api/content/cities/hamburg/summary?locale=de",
    ));
    expect(new Headers(init?.headers).get("If-None-Match")).toBe('"city-v0"');
    expect(new Headers(init?.headers).has("Cookie")).toBe(false);
  });

  it("loads a place detail only when requested and accepts a 304", async () => {
    const fetchImpl = vi
      .fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response())
      .mockResolvedValueOnce(new Response(JSON.stringify(placeResponse)))
      .mockResolvedValueOnce(new Response(null, { status: 304, headers: { ETag: '"place-v1"' } }));
    const client = createCitywalkApiClient({ origin: "https://citywalk.example", fetchImpl });

    await expect(client.getPlace("lubeck", "holstentor", "en"))
      .resolves.toMatchObject({ place: { slug: "holstentor" } });
    await expect(client.loadPlace("lubeck", "holstentor", "en", '"place-v1"'))
      .resolves.toEqual({ status: 304, etag: '"place-v1"' });
    expect(fetchImpl.mock.calls[0]?.[0]).toEqual(new URL(
      "https://citywalk.example/api/content/cities/lubeck/places/holstentor?locale=en",
    ));
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
      getVisitorId: async () => "123e4567-e89b-42d3-a456-426614174000",
    });

    await expect(client.askGuide({
      citySlug: "lubeck", placeSlug: "holstentor", locale: "en",
      question: "When was this built?",
      history: [{ role: "assistant", text: "Ask me about this place." }],
    })).resolves.toMatchObject({ answer: "The gate was completed in 1478." });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toEqual(new URL("https://citywalk.example/api/guide"));
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Cookie"))
      .toBe("better-auth.session_token=opaque");
    expect(init?.body).toBe(JSON.stringify({
      citySlug: "lubeck", placeSlug: "holstentor", locale: "en",
      question: "When was this built?",
      history: [{ role: "assistant", text: "Ask me about this place." }],
      visitorId: "123e4567-e89b-42d3-a456-426614174000",
    }));
  });

  it("requires a native visitor identity before a guide request", async () => {
    const fetchImpl = vi.fn();
    const client = createCitywalkApiClient({
      origin: "https://citywalk.example",
      fetchImpl,
      getAuthCookie: async () => "",
    });
    await expect(client.askGuide({
      citySlug: "lubeck", placeSlug: "holstentor", locale: "en", question: "Why?",
    })).rejects.toThrow("visitor identity");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("retains server-authoritative daily allowance details on a 429", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      error: "Daily AI Guide allowance reached.",
      code: "guide_daily_allowance_reached",
      allowance: {
        kind: "daily_guide", tier: "free", limit: 3, remaining: 0,
        resetAt: 1_800_000_000_000,
      },
    }), { status: 429 }));
    const client = createCitywalkApiClient({
      origin: "https://citywalk.example",
      fetchImpl,
      getAuthCookie: async () => "",
      getVisitorId: async () => "123e4567-e89b-42d3-a456-426614174000",
    });

    const error = await client.askGuide({
      citySlug: "lubeck", placeSlug: "holstentor", locale: "en", question: "Why?",
    }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(CitywalkApiError);
    expect(error).toMatchObject({
      status: 429,
      code: "guide_daily_allowance_reached",
      allowance: { remaining: 0, limit: 3 },
    });
  });

  it("preserves a non-JSON gateway status as technical rather than inventing an allowance", async () => {
    const client = createCitywalkApiClient({
      origin: "https://citywalk.example",
      fetchImpl: vi.fn(async () => new Response("<html>Gateway error</html>", { status: 502 })),
      getAuthCookie: async () => "",
      getVisitorId: async () => "123e4567-e89b-42d3-a456-426614174000",
    });
    const error = await client.askGuide({
      citySlug: "lubeck", placeSlug: "holstentor", locale: "en", question: "Why?",
    }).catch((caught: unknown) => caught);
    expect(error).toMatchObject({ status: 502, code: undefined, allowance: undefined });
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
