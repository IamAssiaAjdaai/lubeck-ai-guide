import "server-only";

import { eq } from "drizzle-orm";

import { user } from "@/db/authSchema";
import { getDb } from "@/db/client";

export async function getAdminSecurityStatus(userId: string) {
  const [record] = await getDb()
    .select({ twoFactorEnabled: user.twoFactorEnabled })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return { twoFactorEnabled: Boolean(record?.twoFactorEnabled) };
}