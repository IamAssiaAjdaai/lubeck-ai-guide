import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";

import * as authSchema from "@/db/authSchema";
import { getDb } from "@/db/client";
import { getBetterAuthEnvironment } from "@/lib/auth/env";

export const AUTH_ROUTE_PATH = "/api/auth";
export const PUBLIC_EMAIL_SIGN_UP_ENABLED = false;

type CreateAuthOptions = Readonly<{
  allowEmailSignUp?: boolean;
}>;

export function createCitywalkAuth(
  options: CreateAuthOptions = {},
) {
  const environment = getBetterAuthEnvironment();

  return betterAuth({
    appName: "CITYWALK Admin",
    baseURL: environment.baseURL,
    basePath: AUTH_ROUTE_PATH,
    secret: environment.secret,
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: authSchema,
      transaction: true,
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: !options.allowEmailSignUp,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      autoSignIn: false,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
  });
}
