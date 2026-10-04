import "server-only";

import { hasRequestDatabase } from "@/db/client";
import {
  AUTH_ROUTE_PATH,
  createCitywalkAuth,
  PUBLIC_EMAIL_SIGN_UP_ENABLED,
} from "@/lib/auth/factory.server";

export { AUTH_ROUTE_PATH, PUBLIC_EMAIL_SIGN_UP_ENABLED };

type CitywalkAuth = ReturnType<typeof createCitywalkAuth>;
let instance: CitywalkAuth | undefined;

/** Validate configuration and construct auth only when a request needs it. */
export function getAuth(): CitywalkAuth {
  // A Cloudflare Worker receives a fresh Hyperdrive database client for each
  // request. Do not retain a Better Auth adapter that references a previous
  // request's database client.
  if (hasRequestDatabase()) {
    return createCitywalkAuth({
      allowEmailSignUp: PUBLIC_EMAIL_SIGN_UP_ENABLED,
    });
  }

  return instance ??= createCitywalkAuth({
    allowEmailSignUp: PUBLIC_EMAIL_SIGN_UP_ENABLED,
  });
}
