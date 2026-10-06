import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

import {
  PUBLIC_CONTENT_CACHE_VERSION,
  PUBLIC_CONTENT_FRESH_MS,
  PUBLIC_CONTENT_MAX_STALE_MS,
  PUBLIC_CONTENT_OFFLINE_FALLBACK_MS,
  PublicContentCache,
  publicContentCacheKey,
} from "../src/lib/publicContentCache";

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { values.set(key, value); }),
    removeItem: vi.fn(async (key: string) => { values.delete(key); }),
  };
}

describe("native public content cache", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deduplicates concurrent network requests and serves the warm value from memory", async () => {
    const storage = createStorage();
    const cache = new PublicContentCache(storage, () => 1_000, vi.fn());
    let resolveRequest!: (value: { status: 200; data: { city: string }; etag: string }) => void;
    const fetcher = vi.fn(() => new Promise<{ status: 200; data: { city: string }; etag: string }>(
      (resolve) => { resolveRequest = resolve; },
    ));
    const key = publicContentCacheKey("city", "en", "hamburg");

    const first = cache.load(key, parseCity, fetcher);
    const second = cache.load(key, parseCity, fetcher);
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
    resolveRequest({ status: 200, data: { city: "hamburg" }, etag: '"v1"' });

    await expect(first).resolves.toEqual({ city: "hamburg" });
    await expect(second).resolves.toEqual({ city: "hamburg" });
    await expect(cache.load(key, parseCity, fetcher)).resolves.toEqual({ city: "hamburg" });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("shows persisted stale content immediately and revalidates it in the background", async () => {
    let now = PUBLIC_CONTENT_FRESH_MS + 100;
    const key = publicContentCacheKey("city", "de", "lubeck");
    const storage = createStorage({
      [`citywalk:public-content:v${PUBLIC_CONTENT_CACHE_VERSION}:${key}`]: JSON.stringify({
        version: PUBLIC_CONTENT_CACHE_VERSION,
        data: { city: "cached" },
        etag: '"old"',
        storedAt: 0,
      }),
    });
    const cache = new PublicContentCache(storage, () => now, vi.fn());
    const fetcher = vi.fn(async () => ({
      status: 200 as const,
      data: { city: "fresh" },
      etag: '"new"',
    }));

    await expect(cache.load(key, parseCity, fetcher)).resolves.toEqual({ city: "cached" });
    await vi.waitFor(() => expect(cache.peek<{ city: string }>(key)).toEqual({ city: "fresh" }));
    expect(fetcher).toHaveBeenCalledWith('"old"', expect.any(AbortSignal));
    now += 1;
  });

  it("falls back to recently viewed public content when refresh fails offline", async () => {
    const now = PUBLIC_CONTENT_MAX_STALE_MS + 60_000;
    const key = publicContentCacheKey("place", "en", "lubeck", "holstentor");
    const storage = createStorage({
      [`citywalk:public-content:v${PUBLIC_CONTENT_CACHE_VERSION}:${key}`]: JSON.stringify({
        version: PUBLIC_CONTENT_CACHE_VERSION,
        data: { city: "cached-offline" },
        etag: '"offline-v1"',
        storedAt: 0,
      }),
    });
    const measurements = vi.fn();
    const cache = new PublicContentCache(storage, () => now, measurements);
    const fetcher = vi.fn(async () => {
      throw new Error("network unavailable");
    });

    await expect(cache.load(key, parseCity, fetcher)).resolves.toEqual({
      city: "cached-offline",
    });
    expect(fetcher).toHaveBeenCalledWith('"offline-v1"', expect.any(AbortSignal));
    expect(measurements).toHaveBeenCalledWith(
      expect.objectContaining({ key, source: "offline" }),
    );
    expect(cache.peek(key)).toBeUndefined();
  });

  it("prefers fresh network content over the offline fallback when connectivity returns", async () => {
    const now = PUBLIC_CONTENT_MAX_STALE_MS + 60_000;
    const key = publicContentCacheKey("city", "en", "lubeck");
    const storage = createStorage({
      [`citywalk:public-content:v${PUBLIC_CONTENT_CACHE_VERSION}:${key}`]: JSON.stringify({
        version: PUBLIC_CONTENT_CACHE_VERSION,
        data: { city: "stale" },
        etag: '"stale-v1"',
        storedAt: 0,
      }),
    });
    const cache = new PublicContentCache(storage, () => now, vi.fn());

    await expect(
      cache.load(key, parseCity, async () => ({
        status: 200,
        data: { city: "fresh-network" },
        etag: '"fresh-v2"',
      })),
    ).resolves.toEqual({ city: "fresh-network" });
    expect(cache.peek(key)).toEqual({ city: "fresh-network" });
  });

  it("does not use public content beyond the bounded offline fallback window", async () => {
    const now = PUBLIC_CONTENT_OFFLINE_FALLBACK_MS + 1;
    const key = publicContentCacheKey("city", "en", "lubeck");
    const storageKey = `citywalk:public-content:v${PUBLIC_CONTENT_CACHE_VERSION}:${key}`;
    const storage = createStorage({
      [storageKey]: JSON.stringify({
        version: PUBLIC_CONTENT_CACHE_VERSION,
        data: { city: "too-old" },
        storedAt: 0,
      }),
    });
    const cache = new PublicContentCache(storage, () => now, vi.fn());

    await expect(
      cache.load(key, parseCity, async () => {
        throw new Error("network unavailable");
      }),
    ).rejects.toThrow("network unavailable");
    expect(storage.removeItem).toHaveBeenCalledWith(storageKey);
  });

  it("renews cached freshness when the API returns 304", async () => {
    let now = 0;
    const cache = new PublicContentCache(createStorage(), () => now, vi.fn());
    const key = publicContentCacheKey("cities", "en");
    const firstFetcher = vi.fn(async () => ({
      status: 200 as const,
      data: { city: "initial" },
      etag: '"same"',
    }));
    await cache.load(key, parseCity, firstFetcher);
    now = PUBLIC_CONTENT_FRESH_MS + 1;
    const revalidate = vi.fn(async () => ({ status: 304 as const, etag: '"same"' }));

    await expect(cache.load(key, parseCity, revalidate)).resolves.toEqual({ city: "initial" });
    await vi.waitFor(() => expect(revalidate).toHaveBeenCalledOnce());
    expect(cache.peek(key)).toEqual({ city: "initial" });
  });

  it("cancels an unused in-flight request without persisting private state", async () => {
    const storage = createStorage();
    const cache = new PublicContentCache(storage, Date.now, vi.fn());
    let observedSignal: AbortSignal | undefined;
    const request = cache.load(
      publicContentCacheKey("place", "en", "hamburg", "rathaus"),
      parseCity,
      (_etag, signal) => {
        observedSignal = signal;
        return new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        });
      },
    );
    await vi.waitFor(() => expect(observedSignal).toBeDefined());
    cache.cancelIfUnused(publicContentCacheKey("place", "en", "hamburg", "rathaus"));

    await expect(request).rejects.toMatchObject({ name: "AbortError" });
    expect(observedSignal?.aborted).toBe(true);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("degrades to network and memory when persistent storage is unavailable", async () => {
    const storage = {
      getItem: vi.fn(async () => { throw new Error("storage unavailable"); }),
      setItem: vi.fn(async () => { throw new Error("storage unavailable"); }),
      removeItem: vi.fn(async () => undefined),
    };
    const measurements = vi.fn();
    const cache = new PublicContentCache(storage, () => 25, measurements);
    const key = publicContentCacheKey("city", "en", "hamburg");

    await expect(cache.load(key, parseCity, async () => ({
      status: 200,
      data: { city: "hamburg" },
    }))).resolves.toEqual({ city: "hamburg" });
    await expect(cache.load(key, parseCity, vi.fn())).resolves.toEqual({ city: "hamburg" });
    expect(measurements).toHaveBeenCalledWith(expect.objectContaining({ source: "network" }));
    expect(measurements).toHaveBeenCalledWith(expect.objectContaining({ source: "memory" }));
  });
});

function parseCity(value: unknown): { city: string } {
  if (!value || typeof value !== "object" || !("city" in value) || typeof value.city !== "string") {
    throw new Error("Invalid city fixture.");
  }
  return { city: value.city };
}
