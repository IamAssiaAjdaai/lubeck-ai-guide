import AsyncStorage from "@react-native-async-storage/async-storage";

const DAY_MS = 24 * 60 * 60 * 1000;

export const NATIVE_VISITOR_RETENTION_MS = 180 * DAY_MS;
export const NATIVE_VISITOR_STORAGE_KEY = "citywalk:anonymous-visitor:v1";

const STORAGE_VERSION = 1;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AsyncStorageLike = Pick<typeof AsyncStorage, "getItem" | "setItem" | "removeItem">;

type StoredVisitorIdentity = Readonly<{
  version: 1;
  id: string;
  expiresAt: number;
}>;

type ResolveVisitorOptions = Readonly<{
  storage?: AsyncStorageLike;
  now?: number;
  createId?: () => string;
}>;

let memoryIdentity: StoredVisitorIdentity | undefined;
let activeResolution: Promise<string> | undefined;

function createNativeId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  // This pseudonymous identifier is neither authentication material nor a fingerprint.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (token) => {
    const random = Math.floor(Math.random() * 16);
    const value = token === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function isNativeVisitorId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function parseStoredIdentity(rawValue: string | null): StoredVisitorIdentity | undefined {
  if (!rawValue) return undefined;
  try {
    const value = JSON.parse(rawValue) as Partial<StoredVisitorIdentity>;
    if (
      value.version !== STORAGE_VERSION ||
      !isNativeVisitorId(value.id) ||
      typeof value.expiresAt !== "number" ||
      !Number.isFinite(value.expiresAt)
    ) {
      return undefined;
    }
    return { version: STORAGE_VERSION, id: value.id, expiresAt: value.expiresAt };
  } catch {
    return undefined;
  }
}

export async function resolveNativeVisitorId({
  storage = AsyncStorage,
  now = Date.now(),
  createId = createNativeId,
}: ResolveVisitorOptions = {}): Promise<string> {
  let stored: StoredVisitorIdentity | undefined;
  try {
    stored = parseStoredIdentity(await storage.getItem(NATIVE_VISITOR_STORAGE_KEY)) ?? memoryIdentity;
  } catch {
    stored = memoryIdentity;
  }

  const reusable = stored && stored.expiresAt > now ? stored : undefined;
  const identity = reusable ?? {
    version: STORAGE_VERSION,
    id: createId(),
    expiresAt: now + NATIVE_VISITOR_RETENTION_MS,
  } as const;

  if (!isNativeVisitorId(identity.id)) {
    throw new Error("CITYWALK could not create an anonymous visitor identity.");
  }

  memoryIdentity = identity;
  try {
    await storage.setItem(NATIVE_VISITOR_STORAGE_KEY, JSON.stringify(identity));
  } catch {
    // The in-memory identity keeps the guest experience stable for this app process.
  }
  return identity.id;
}

export function getNativeVisitorId(): Promise<string> {
  activeResolution ??= resolveNativeVisitorId().catch((error: unknown) => {
    activeResolution = undefined;
    throw error;
  });
  return activeResolution;
}

export function resetNativeVisitorIdentityForTests(): void {
  memoryIdentity = undefined;
  activeResolution = undefined;
}
