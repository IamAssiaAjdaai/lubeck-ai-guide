import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { expo } from "@better-auth/expo";
import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { twoFactor } from "better-auth/plugins";
import { AUTH_MIN_PASSWORD_LENGTH, AUTH_MAX_PASSWORD_LENGTH } from "@citywalk/traveler-core";

import * as authSchema from "@/db/authSchema";
import { getDb } from "@/db/client";
import { getAdminPasskeyRelyingParty, requireActiveStaffForPasskey } from "@/lib/auth/adminSecurity.server";
import { getBetterAuthEnvironment } from "@/lib/auth/env";
import { getCitywalkSocialAuthConfiguration } from "@/lib/auth/socialProviders.server";

export const AUTH_ROUTE_PATH = "/api/auth";
export const PUBLIC_EMAIL_SIGN_UP_ENABLED = true;
export const NATIVE_AUTH_TRUSTED_ORIGINS = ["citywalk://", "citywalk://*"] as const;

type CreateAuthOptions = Readonly<{
  allowEmailSignUp?: boolean;
}>;

export function createCitywalkAuth(
  options: CreateAuthOptions = {},
) {
  const environment = getBetterAuthEnvironment();
  const socialAuth = getCitywalkSocialAuthConfiguration();
  const hasSocialProviders =
    Boolean(socialAuth.socialProviders.google) ||
    Boolean(socialAuth.socialProviders.apple);

  return betterAuth({
    appName: "CITYWALK",
    baseURL: environment.baseURL,
    basePath: AUTH_ROUTE_PATH,
    secret: environment.secret,
    trustedOrigins: [
      ...NATIVE_AUTH_TRUSTED_ORIGINS,
      ...socialAuth.trustedOrigins,
    ],
    plugins: [
      expo(),
      passkey({
        ...getAdminPasskeyRelyingParty(environment.baseURL),
        registration: {
          afterVerification: async ({ user }) => {
            await requireActiveStaffForPasskey(user.id);
          },
        },
      }),
      twoFactor({
        issuer: "CITYWALK Control Center",
        trustDeviceMaxAge: 60 * 60 * 24 * 30,
        accountLockout: {
          enabled: true,
          maxFailedAttempts: 5,
          durationSeconds: 15 * 60,
        },
      }),
    ],
    ...(hasSocialProviders
      ? { socialProviders: socialAuth.socialProviders }
      : {}),
    emailVerification: {
      sendVerificationEmail: async (data, request) =>
        (await import("./lifecycle/email.server")).sendEmailVerificationEmail(data, request),
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: false,
      expiresIn: 60 * 60,
    },
    account: {
      accountLinking: {
        enabled: true,
        disableImplicitLinking: true,
        trustedProviders: ["google", "apple"],
      },
    },
    // The factory also supports the existing plain-Node admin bootstrap. Load
    // Next/server-only recovery dependencies only for a recovery request.
    hooks: { before: createAuthMiddleware(async ctx => {
      if (ctx.path !== "/request-password-reset" && ctx.path !== "/reset-password") return;
      return (await import("./lifecycle/hooks.server")).lifecycleBefore(ctx);
    }) },
    // Library warnings can contain account identifiers. Lifecycle logs use safe codes only.
    logger: { disabled: true },
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: authSchema,
      transaction: true,
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: !options.allowEmailSignUp,
      minPasswordLength: AUTH_MIN_PASSWORD_LENGTH,
      maxPasswordLength: AUTH_MAX_PASSWORD_LENGTH,
      autoSignIn: false,
      requireEmailVerification: true,
      sendResetPassword: async (data, request) => (await import("./lifecycle/email.server")).sendPasswordResetEmail(data, request),
      resetPasswordTokenExpiresIn: 30 * 60,
      revokeSessionsOnPasswordReset: true,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
  });
}
