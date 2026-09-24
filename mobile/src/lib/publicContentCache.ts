import AsyncStorage from "@react-native-async-storage/async-storage";

export const PUBLIC_CONTENT_CACHE_VERSION = 1;
export const PUBLIC_CONTENT_FRESH_MS = 5 * 60 * 1000;
export const PUBLIC_CONTENT_MAX_STALE_MS = 24 * 60 * 60 * 1000;

export type PublicContentFetch<T> =
  | Readonly<{ status: 200; data: T; etag?: string }>
  | Readonly<{ status: 304; etag?: string }>;

type CacheEntry<T> = Readonly<{
  data: T;
  etag?: string;
  storedAt: number;
}>;

type StoredEntry = Readonly<{
  version: number;
  data: unknown;
  etag?: string;
  storedAt: number;
}>;

type Storage = Pick<typeof AsyncStorage, "getItem" | "setItem" | "removeItem">;

export type PublicContentMeasurement = Readonly<{
  key: string;
  source: "memory" | "persisted" | "network";
  durationMs: number;
}>;

type MeasurementReporter = (measurement: PublicContentMeasurement) => void;

export class PublicContentCache {
  private readonly memory = new Map<string, CacheEntry<unknown>>();
  private readonly inflight = new Map<
    string,
    Readonly<{ promise: Promise<unknown>; controller: AbortController }>
  >();
  private readonly listeners = new Map<string, Set<() => void>>();

  constructor(
    private readonly storage: Storage = AsyncStorage,
    private readonly now: () => number = Date.now,
    private readonly reportMeasurement: MeasurementReporter = reportDevelopmentMeasurement,
  ) {}

  peek<T>(key: string): T | undefined {
    const entry = this.memory.get(key);
    if (!entry || this.now() - entry.storedAt > PUBLIC_CONTENT_MAX_STALE_MS) {
      return undefined;
    }
    return entry.data as T;
  }

  subscribe(key: string, listener: () => void): () => void {
    const listeners = this.listeners.get(key) ?? new Set();
    listeners.add(listener);
    this.listeners.set(key, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.listeners.delete(key);
    };
  }

  async load<T>(
    key: string,
    parse: (value: unknown) => T,
    fetcher: (etag: string | undefined, signal: AbortSignal) => Promise<PublicContentFetch<T>>,
  ): Promise<T> {
    const startedAt = this.now();
    const memory = this.memory.get(key) as CacheEntry<T> | undefined;
    if (memory && this.isUsable(memory)) {
      if (!this.isFresh(memory)) void this.refresh(key, parse, fetcher, memory).catch(() => undefined);
      this.measure(key, "memory", startedAt);
      return memory.data;
    }

    const persisted = await this.readPersisted(key, parse);
    if (persisted) {
      this.memory.set(key, persisted);
      if (!this.isFresh(persisted)) void this.refresh(key, parse, fetcher, persisted).catch(() => undefined);
      this.measure(key, "persisted", startedAt);
      return persisted.data;
    }
    return this.refresh(key, parse, fetcher);
  }

  async prefetch<T>(
    key: string,
    parse: (value: unknown) => T,
    fetcher: (etag: string | undefined, signal: AbortSignal) => Promise<PublicContentFetch<T>>,
  ): Promise<void> {
    await this.load(key, parse, fetcher);
  }

  clearMemory(): void {
    this.inflight.forEach(({ controller }) => controller.abort());
    this.memory.clear();
    this.inflight.clear();
    this.listeners.clear();
  }

  cancelIfUnused(key: string): void {
    if ((this.listeners.get(key)?.size ?? 0) === 0) {
      this.inflight.get(key)?.controller.abort();
    }
  }

  private isFresh(entry: CacheEntry<unknown>): boolean {
    return this.now() - entry.storedAt <= PUBLIC_CONTENT_FRESH_MS;
  }

  private isUsable(entry: CacheEntry<unknown>): boolean {
    return this.now() - entry.storedAt <= PUBLIC_CONTENT_MAX_STALE_MS;
  }

  private async readPersisted<T>(
    key: string,
    parse: (value: unknown) => T,
  ): Promise<CacheEntry<T> | undefined> {
    try {
      const raw = await this.storage.getItem(storageKey(key));
      if (!raw) return undefined;
      const stored = JSON.parse(raw) as StoredEntry;
      if (
        stored.version !== PUBLIC_CONTENT_CACHE_VERSION ||
        !Number.isFinite(stored.storedAt) ||
        this.now() - stored.storedAt > PUBLIC_CONTENT_MAX_STALE_MS
      ) {
        await this.storage.removeItem(storageKey(key));
        return undefined;
      }
      return {
        data: parse(stored.data),
        ...(stored.etag ? { etag: stored.etag } : {}),
        storedAt: stored.storedAt,
      };
    } catch {
      return undefined;
    }
  }

  private async refresh<T>(
    key: string,
    parse: (value: unknown) => T,
    fetcher: (etag: string | undefined, signal: AbortSignal) => Promise<PublicContentFetch<T>>,
    previous?: CacheEntry<T>,
  ): Promise<T> {
    const existing = this.inflight.get(key) as
      | Readonly<{ promise: Promise<T>; controller: AbortController }>
      | undefined;
    if (existing) return existing.promise;
    const controller = new AbortController();
    const startedAt = this.now();
    const request = (async () => {
      const response = await fetcher(previous?.etag, controller.signal);
      const entry: CacheEntry<T> = response.status === 304 && previous
        ? { ...previous, ...(response.etag ? { etag: response.etag } : {}), storedAt: this.now() }
        : response.status === 200
          ? {
              data: parse(response.data),
              ...(response.etag ? { etag: response.etag } : {}),
              storedAt: this.now(),
            }
          : (() => { throw new Error("Invalid public content cache response."); })();
      this.memory.set(key, entry);
      await this.persist(key, entry);
      this.listeners.get(key)?.forEach((listener) => listener());
      this.measure(key, "network", startedAt);
      return entry.data;
    })().finally(() => this.inflight.delete(key));
    this.inflight.set(key, { promise: request, controller });
    return request;
  }

  private async persist<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    try {
      await this.storage.setItem(storageKey(key), JSON.stringify({
        version: PUBLIC_CONTENT_CACHE_VERSION,
        data: entry.data,
        ...(entry.etag ? { etag: entry.etag } : {}),
        storedAt: entry.storedAt,
      } satisfies StoredEntry));
    } catch {
      // Public content still remains available from memory/network.
    }
  }

  private measure(
    key: string,
    source: PublicContentMeasurement["source"],
    startedAt: number,
  ): void {
    this.reportMeasurement({ key, source, durationMs: Math.max(0, this.now() - startedAt) });
  }
}

export const publicContentCache = new PublicContentCache();

export function publicContentCacheKey(
  resource: "cities" | "city" | "place",
  locale: string,
  ...identifiers: string[]
): string {
  return [resource, locale, ...identifiers].join(":");
}

function storageKey(key: string): string {
  return `citywalk:public-content:v${PUBLIC_CONTENT_CACHE_VERSION}:${key}`;
}

function reportDevelopmentMeasurement(measurement: PublicContentMeasurement): void {
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.info("CITYWALK_PERF", measurement);
  }
}
