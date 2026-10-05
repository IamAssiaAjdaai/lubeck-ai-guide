import "server-only";

import { eq } from "drizzle-orm";
import { APIError } from "better-auth/api";

import { staffMemberships } from "@/db/authSchema";
import { getDb } from "@/db/client";
import type { BetterAuthEnvironment } from "@/lib/auth/env";

export function getAdminPasskeyRelyingParty(
  baseURL: BetterAuthEnvironment["baseURL"],
) {
  const origin = typeof baseURL === "string" ? baseURL : baseURL.fallback;
  const url = new URL(origin);

  return {
    rpID: url.hostname,
    rpName: "CITYWALK Control Center",
    origin: url.origin,
    authenticatorSelection: {
      residentKey: "required" as const,
      userVerification: "required" as const,
    },
  };
}

export async function requireActiveStaffForPasskey(userId: string) {
  const [staff] = await getDb()
    .select({
      active: staffMemberships.active,
    })
    .from(staffMemberships)
    .where(eq(staffMemberships.userId, userId))
    .limit(1);

  if (!staff?.active) {
    throw new APIError("FORBIDDEN", {
      code: "STAFF_PASSKEY_REQUIRED",
      message: "Passkey registration is restricted to active CITYWALK staff.",
    });
  }
}
