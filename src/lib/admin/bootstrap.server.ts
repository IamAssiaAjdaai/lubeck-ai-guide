import { eq } from "drizzle-orm";

import { staffMemberships, user } from "@/db/authSchema";
import { getDb } from "@/db/client";
import { createCitywalkAuth } from "@/lib/auth/factory.server";

export type SuperAdminBootstrapInput = Readonly<{
  email: string;
  name: string;
  password: string;
}>;

export type SuperAdminBootstrapResult = Readonly<{
  status: "created" | "already_configured";
  userId: string;
}>;

export class SuperAdminBootstrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SuperAdminBootstrapError";
  }
}

export function readSuperAdminBootstrapInput(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): SuperAdminBootstrapInput {
  const email = environment.CITYWALK_ADMIN_EMAIL?.trim().toLowerCase();
  const name = environment.CITYWALK_ADMIN_NAME?.trim();
  const password = environment.CITYWALK_ADMIN_PASSWORD;

  if (!email || !email.includes("@")) {
    throw new SuperAdminBootstrapError(
      "CITYWALK_ADMIN_EMAIL must contain a valid email address.",
    );
  }
  if (!name) {
    throw new SuperAdminBootstrapError(
      "CITYWALK_ADMIN_NAME must be configured.",
    );
  }
  if (!password || password.length < 12 || password.length > 128) {
    throw new SuperAdminBootstrapError(
      "CITYWALK_ADMIN_PASSWORD must contain 12 to 128 characters.",
    );
  }

  return { email, name, password };
}

export async function createSuperAdmin(
  input: SuperAdminBootstrapInput,
): Promise<SuperAdminBootstrapResult> {
  const db = getDb();
  const [existingUser] = await db
    .select({ id: user.id, emailVerified: user.emailVerified })
    .from(user)
    .where(eq(user.email, input.email))
    .limit(1);

  if (existingUser) {
    const [membership] = await db
      .select({
        role: staffMemberships.role,
        active: staffMemberships.active,
        globalAccess: staffMemberships.globalAccess,
      })
      .from(staffMemberships)
      .where(eq(staffMemberships.userId, existingUser.id))
      .limit(1);

    if (
      membership?.role === "super_admin" &&
      membership.active &&
      membership.globalAccess
    ) {
      // The bootstrap command is an operator-controlled provisioning path, not
      // public signup. Reconcile older bootstrap-created admins that predate
      // this rule so Better Auth's requireEmailVerification does not block
      // their CMS sign-in with HTTP 403.
      if (!existingUser.emailVerified) {
        await db
          .update(user)
          .set({ emailVerified: true })
          .where(eq(user.id, existingUser.id));
      }
      return { status: "already_configured", userId: existingUser.id };
    }

    throw new SuperAdminBootstrapError(
      "That email already belongs to an identity without the requested super-admin membership. Refusing to elevate it automatically.",
    );
  }

  const bootstrapAuth = createCitywalkAuth({ allowEmailSignUp: true });
  const result = await bootstrapAuth.api.signUpEmail({
    body: {
      email: input.email,
      name: input.name,
      password: input.password,
    },
  });

  if (!result?.user?.id) {
    throw new SuperAdminBootstrapError(
      "Better Auth did not create the requested identity.",
    );
  }

  try {
    // Admin bootstrap is trusted operator provisioning. Mark the identity as
    // verified explicitly instead of requiring the public traveler email flow.
    await db
      .update(user)
      .set({ emailVerified: true })
      .where(eq(user.id, result.user.id));

    await db.insert(staffMemberships).values({
      userId: result.user.id,
      role: "super_admin",
      active: true,
      globalAccess: true,
      createdByUserId: result.user.id,
    });
  } catch (error) {
    // Avoid leaving a bootstrap-created traveler identity behind when the
    // CITYWALK membership or verification write cannot complete.
    await db.delete(user).where(eq(user.id, result.user.id));
    throw error;
  }

  return { status: "created", userId: result.user.id };
}
