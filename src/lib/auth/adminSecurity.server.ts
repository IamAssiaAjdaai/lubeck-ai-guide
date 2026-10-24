import { eq } from "drizzle-orm";
import { APIError } from "better-auth/api";

import { staffMemberships } from "@/db/authSchema";
import { getDb } from "@/db/client";

type AdminPasskeyOrigin = string | Readonly<{
  fallback: string;
  allowedHosts: readonly string[];
  protocol: string;
}>;

export function getAdminPasskeyRelyingParty(baseURL: AdminPasskeyOrigin) {
  const origin = typeof baseURL === "string" ? baseURL : baseURL.fallback;
  const url = new URL(origin);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "localhost")) {
    throw new Error("Admin passkey origin must use HTTPS (except localhost).");
  }
  if (typeof baseURL !== "string" &&
      (!baseURL.allowedHosts.includes(url.hostname) || baseURL.protocol + ":" !== url.protocol)) {
    throw new Error("Admin passkey fallback must match an allowed host and protocol.");
  }

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
