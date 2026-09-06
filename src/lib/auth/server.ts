import "server-only";

import {
  AUTH_ROUTE_PATH,
  createCitywalkAuth,
  PUBLIC_EMAIL_SIGN_UP_ENABLED,
} from "@/lib/auth/factory.server";

export { AUTH_ROUTE_PATH, PUBLIC_EMAIL_SIGN_UP_ENABLED };

export const auth = createCitywalkAuth();
