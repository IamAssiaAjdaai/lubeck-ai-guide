import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  travelerGuestLinks,
  travelerProfiles,
} from "@/db/travelerSchema";
import { isLocale, type Locale } from "@/lib/i18n";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type GuestLinkInput = Readonly<{
  visitorId: string;
  sessionId: string;
  preferredLocale: Locale;
}>;

export class GuestIdentityConflictError extends Error {
  constructor() {
    super("Anonymous visitor identity is already linked to another account.");
    this.name = "GuestIdentityConflictError";
  }
}

export function parseGuestLinkInput(value: unknown): GuestLinkInput | undefined {
  if (!value || typeof value !== "object") return undefined;

  const input = value as Record<string, unknown>;
  if (
    typeof input.visitorId !== "string" ||
    !UUID_PATTERN.test(input.visitorId) ||
    typeof input.sessionId !== "string" ||
    !UUID_PATTERN.test(input.sessionId) ||
    !isLocale(input.preferredLocale)
  ) {
    return undefined;
  }

  return {
    visitorId: input.visitorId,
    sessionId: input.sessionId,
    preferredLocale: input.preferredLocale,
  };
}

export async function linkGuestIdentityToUser(
  userId: string,
  input: GuestLinkInput,
): Promise<"linked" | "already_linked"> {
  const db = getDb();

  return db.transaction(async (transaction) => {
    await transaction
      .insert(travelerProfiles)
      .values({
        userId,
        preferredLocale: input.preferredLocale,
      })
      .onConflictDoUpdate({
        target: travelerProfiles.userId,
        set: {
          preferredLocale: input.preferredLocale,
          updatedAt: new Date(),
        },
      });

    const [existingLink] = await transaction
      .select({
        id: travelerGuestLinks.id,
        userId: travelerGuestLinks.userId,
      })
      .from(travelerGuestLinks)
      .where(eq(travelerGuestLinks.visitorId, input.visitorId))
      .limit(1);

    if (existingLink && existingLink.userId !== userId) {
      throw new GuestIdentityConflictError();
    }

    if (existingLink) {
      await transaction
        .update(travelerGuestLinks)
        .set({
          sessionId: input.sessionId,
          updatedAt: new Date(),
        })
        .where(eq(travelerGuestLinks.id, existingLink.id));
      return "already_linked";
    }

    await transaction.insert(travelerGuestLinks).values({
      userId,
      visitorId: input.visitorId,
      sessionId: input.sessionId,
    });

    return "linked";
  });
}
