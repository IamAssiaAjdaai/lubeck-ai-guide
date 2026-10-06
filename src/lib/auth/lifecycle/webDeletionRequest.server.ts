import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, like } from "drizzle-orm";

import { user, verification } from "@/db/authSchema";
import { getDb } from "@/db/client";
import {
  deleteTravelerAccountByWebVerification,
  WEB_DELETE_VERIFICATION_PREFIX,
} from "./deleteAccount.server";
import {
  deletionEmailConfiguration,
  sendAccountDeletionVerificationEmail,
} from "./email.server";
import { limitLifecycle, LifecycleError } from "./rateLimit.server";

const TOKEN_BYTES = 32;
const TOKEN_TTL_MS = 30 * 60 * 1000;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const EMAIL_PATTERN = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function verificationIdentifier(token: string) {
  return `${WEB_DELETE_VERIFICATION_PREFIX}${createHash("sha256").update(token).digest("hex")}`;
}

export async function requestWebAccountDeletion(emailInput: string) {
  const email = normalizeEmail(emailInput);
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    throw new LifecycleError("INVALID_REQUEST", 400);
  }

  await limitLifecycle("request", email);
  // Fail consistently for known and unknown addresses when email delivery is not
  // configured; otherwise provider configuration could become an enumeration oracle.
  deletionEmailConfiguration();

  const [owner] = await getDb().select({ id: user.id, email: user.email })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  if (!owner) return;

  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  const identifier = verificationIdentifier(token);
  let stored = false;

  await getDb().transaction(async tx => {
    // Serialize requests for the same account and avoid emailing a token for an
    // account that was deleted between the public lookup and this transaction.
    const [locked] = await tx.select({ id: user.id }).from(user).where(eq(user.id, owner.id)).for("update");
    if (!locked) return;

    await tx.delete(verification).where(and(
      eq(verification.value, owner.id),
      like(verification.identifier, `${WEB_DELETE_VERIFICATION_PREFIX}%`),
    ));
    await tx.insert(verification).values({
      id: randomUUID(),
      identifier,
      value: owner.id,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    });
    stored = true;
  });

  if (stored) {
    await sendAccountDeletionVerificationEmail({
      user: { email: owner.email },
      token,
    });
  }
}

export async function confirmWebAccountDeletion(tokenInput: string) {
  const token = tokenInput.trim();
  if (!TOKEN_PATTERN.test(token)) throw new LifecycleError("INVALID_REQUEST", 400);
  const identifier = verificationIdentifier(token);
  await limitLifecycle("delete", identifier);
  await deleteTravelerAccountByWebVerification(identifier);
}
