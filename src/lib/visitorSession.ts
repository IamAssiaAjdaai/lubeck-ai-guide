const DAY_MS = 24 * 60 * 60 * 1000;

export const ANONYMOUS_VISITOR_RETENTION_MS = 180 * DAY_MS;
export const VISITOR_SESSION_RETENTION_MS = DAY_MS;

export const ANONYMOUS_VISITOR_STORAGE_KEY = "citywalk:anonymous-visitor:v1";
export const VISITOR_SESSION_STORAGE_KEY = "citywalk:visitor-session:v1";

const STORAGE_VERSION = 1;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type StoredVisitorIdentity = Readonly<{
  version: 1;
  id: string;
  expiresAt: number;
}>;

type StoredSessionIdentity = Readonly<{
  version: 1;
  id: string;
  visitorId: string;
  expiresAt: number;
}>;

export type AnonymousVisitorSessionIdentity = Readonly<{
  visitorId: string;
  sessionId: string;
}>;

type ResolveVisitorSessionOptions = Readonly<{
  persistentStorage: StorageLike;
  sessionStorage: StorageLike;
  now?: number;
  createId?: () => string;
}>;

function createMemoryStorage(): StorageLike {
  const values = new Map<string, string>();

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

const fallbackPersistentStorage = createMemoryStorage();
const fallbackSessionStorage = createMemoryStorage();

function createBrowserId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  // This identifier is analytics-only, never an authentication secret.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (token) => {
    const random = Math.floor(Math.random() * 16);
    const value = token === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function isValidId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function parseVisitorIdentity(rawValue: string | null): StoredVisitorIdentity | undefined {
  if (!rawValue) return undefined;

  try {
    const value = JSON.parse(rawValue) as Partial<StoredVisitorIdentity>;

    if (
      value.version !== STORAGE_VERSION ||
      !isValidId(value.id) ||
      typeof value.expiresAt !== "number"
    ) {
      return undefined;
    }

    return {
      version: STORAGE_VERSION,
      id: value.id,
      expiresAt: value.expiresAt,
    };
  } catch {
    return undefined;
  }
}

function parseSessionIdentity(rawValue: string | null): StoredSessionIdentity | undefined {
  if (!rawValue) return undefined;

  try {
    const value = JSON.parse(rawValue) as Partial<StoredSessionIdentity>;

    if (
      value.version !== STORAGE_VERSION ||
      !isValidId(value.id) ||
      !isValidId(value.visitorId) ||
      typeof value.expiresAt !== "number"
    ) {
      return undefined;
    }

    return {
      version: STORAGE_VERSION,
      id: value.id,
      visitorId: value.visitorId,
      expiresAt: value.expiresAt,
    };
  } catch {
    return undefined;
  }
}

function readStorage(storage: StorageLike, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(storage: StorageLike, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    // CITYWALK stays usable when browser storage is unavailable.
  }
}

export function resolveVisitorSessionIdentity({
  persistentStorage,
  sessionStorage,
  now = Date.now(),
  createId = createBrowserId,
}: ResolveVisitorSessionOptions): AnonymousVisitorSessionIdentity {
  const storedVisitor = parseVisitorIdentity(
    readStorage(persistentStorage, ANONYMOUS_VISITOR_STORAGE_KEY),
  );

  const visitor =
    storedVisitor && storedVisitor.expiresAt > now
      ? storedVisitor
      : {
          version: STORAGE_VERSION,
          id: createId(),
          expiresAt: now + ANONYMOUS_VISITOR_RETENTION_MS,
        } as const;

  writeStorage(
    persistentStorage,
    ANONYMOUS_VISITOR_STORAGE_KEY,
    JSON.stringify(visitor),
  );

  const storedSession = parseSessionIdentity(
    readStorage(sessionStorage, VISITOR_SESSION_STORAGE_KEY),
  );

  const session =
    storedSession &&
    storedSession.expiresAt > now &&
    storedSession.visitorId === visitor.id
      ? storedSession
      : {
          version: STORAGE_VERSION,
          id: createId(),
          visitorId: visitor.id,
          expiresAt: now + VISITOR_SESSION_RETENTION_MS,
        } as const;

  writeStorage(
    sessionStorage,
    VISITOR_SESSION_STORAGE_KEY,
    JSON.stringify(session),
  );

  return {
    visitorId: visitor.id,
    sessionId: session.id,
  };
}

function getBrowserStorage(
  name: "localStorage" | "sessionStorage",
  fallback: StorageLike,
): StorageLike {
  if (typeof window === "undefined") return fallback;

  try {
    const storage = window[name];
    const probeKey = "citywalk:storage-probe";
    storage.setItem(probeKey, "1");
    storage.removeItem(probeKey);
    return storage;
  } catch {
    return fallback;
  }
}

export function getBrowserVisitorSessionIdentity(): AnonymousVisitorSessionIdentity {
  return resolveVisitorSessionIdentity({
    persistentStorage: getBrowserStorage("localStorage", fallbackPersistentStorage),
    sessionStorage: getBrowserStorage("sessionStorage", fallbackSessionStorage),
  });
}

export function getVisitorAnalyticsProperties(
  identity: AnonymousVisitorSessionIdentity,
) {
  return {
    citywalk_visitor_id: identity.visitorId,
    citywalk_session_id: identity.sessionId,
  } as const;
}
