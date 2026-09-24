import "server-only";

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
  return instance ??= createCitywalkAuth({
    allowEmailSignUp: PUBLIC_EMAIL_SIGN_UP_ENABLED,
  });
}
