import AsyncStorage from "@react-native-async-storage/async-storage";

import type { GuideSource } from "./api/contracts";
import type { GuideConversationMessage } from "./guideConversation";

const VERSION = 1;
const MAX_TURNS = 20;
const MAX_TEXT_LENGTH = 4_000;
const MAX_SOURCES_PER_ANSWER = 10;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type Storage = Pick<typeof AsyncStorage, "getItem" | "setItem" | "removeItem">;
type StoredMessage = Readonly<{
  id: string;
  role: "user" | "assistant";
  kind: "message";
  text: string;
  sources?: readonly GuideSource[];
}>;

function storageKey(citySlug: string, placeSlug: string): string | undefined {
  return SLUG.test(citySlug) && SLUG.test(placeSlug)
    ? `citywalk:guide:${VERSION}:${citySlug}:${placeSlug}`
    : undefined;
}

function cleanSource(value: unknown): GuideSource | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  if (
    typeof source.label !== "string" || !source.label.trim() ||
    typeof source.url !== "string" || !source.url.trim() ||
    typeof source.verifiedAt !== "string" ||
    typeof source.citySlug !== "string" || !SLUG.test(source.citySlug) ||
    typeof source.placeSlug !== "string" || !SLUG.test(source.placeSlug) ||
    !Array.isArray(source.chunkIds)
  ) return undefined;
  try {
    const url = new URL(source.url);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
  } catch {
    return undefined;
  }
  return {
    label: source.label.slice(0, 240),
    url: source.url,
    verifiedAt: source.verifiedAt.slice(0, 40),
    citySlug: source.citySlug,
    placeSlug: source.placeSlug,
    chunkIds: source.chunkIds.flatMap((id) =>
      typeof id === "string" && id.trim() ? [id.slice(0, 160)] : [],
    ).slice(0, 20),
  };
}

function cleanMessage(value: unknown): StoredMessage | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const message = value as Record<string, unknown>;
  if (
    message.kind !== "message" ||
    (message.role !== "user" && message.role !== "assistant") ||
    typeof message.id !== "string" || !message.id.trim() ||
    typeof message.text !== "string" || !message.text.trim()
  ) return undefined;
  const sources = message.role === "assistant" && Array.isArray(message.sources)
    ? message.sources.flatMap((source) => {
      const clean = cleanSource(source);
      return clean ? [clean] : [];
    }).slice(0, MAX_SOURCES_PER_ANSWER)
    : [];
  return {
    id: message.id.slice(0, 120),
    role: message.role,
    kind: "message",
    text: message.text.slice(0, MAX_TEXT_LENGTH),
    ...(sources.length ? { sources } : {}),
  };
}

export function completedGuideMessages(
  messages: readonly GuideConversationMessage[],
): readonly GuideConversationMessage[] {
  const clean = messages.flatMap((message) => {
    const stored = cleanMessage(message);
    return stored ? [stored] : [];
  });
  const turns: StoredMessage[] = [];
  for (let index = 0; index + 1 < clean.length; index += 1) {
    if (clean[index]?.role !== "user" || clean[index + 1]?.role !== "assistant") continue;
    turns.push(clean[index]!, clean[index + 1]!);
    index += 1;
  }
  return turns.slice(-MAX_TURNS * 2);
}

export function createGuideConversationStore(storage: Storage = AsyncStorage) {
  const memory = new Map<string, readonly GuideConversationMessage[]>();

  return {
    async load(citySlug: string, placeSlug: string): Promise<readonly GuideConversationMessage[]> {
      const key = storageKey(citySlug, placeSlug);
      if (!key) return [];
      try {
        const raw = await storage.getItem(key);
        if (!raw) return memory.get(key) ?? [];
        const record: unknown = JSON.parse(raw);
        if (!record || typeof record !== "object" || Array.isArray(record)) return memory.get(key) ?? [];
        const value = record as Record<string, unknown>;
        if (
          value.version !== VERSION || value.citySlug !== citySlug ||
          value.placeSlug !== placeSlug || !Array.isArray(value.messages)
        ) return memory.get(key) ?? [];
        const messages = completedGuideMessages(value.messages as GuideConversationMessage[]);
        memory.set(key, messages);
        return messages;
      } catch {
        return memory.get(key) ?? [];
      }
    },
    async save(
      citySlug: string,
      placeSlug: string,
      messages: readonly GuideConversationMessage[],
    ): Promise<void> {
      const key = storageKey(citySlug, placeSlug);
      if (!key) return;
      const completed = completedGuideMessages(messages);
      memory.set(key, completed);
      try {
        await storage.setItem(key, JSON.stringify({
          version: VERSION, citySlug, placeSlug, messages: completed,
        }));
      } catch {
        // An unavailable device store must not break the guest conversation.
      }
    },
    async clear(citySlug: string, placeSlug: string): Promise<void> {
      const key = storageKey(citySlug, placeSlug);
      if (!key) return;
      memory.delete(key);
      try {
        await storage.removeItem(key);
      } catch {
        // The visible conversation can still be cleared when storage fails.
      }
    },
  };
}

export const guideConversationStore = createGuideConversationStore();
