import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { AUTH_MIN_PASSWORD_LENGTH, AUTH_MAX_PASSWORD_LENGTH } from "@citywalk/traveler-core";

import * as authSchema from "@/db/authSchema";
import { getDb } from "@/db/client";
import { getBetterAuthEnvironment } from "@/lib/auth/env";

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

  return betterAuth({
    appName: "CITYWALK",
    baseURL: environment.baseURL,
    basePath: AUTH_ROUTE_PATH,
    secret: environment.secret,
    trustedOrigins: [...NATIVE_AUTH_TRUSTED_ORIGINS],
    plugins: [expo()],
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
