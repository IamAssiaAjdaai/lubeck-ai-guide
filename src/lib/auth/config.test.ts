import { describe, expect, it } from "vitest";

import {
  AUTH_ROUTE_PATH,
  PUBLIC_EMAIL_SIGN_UP_ENABLED,
} from "@/lib/auth/factory.server";

describe("Better Auth configuration", () => {
  it("uses the official auth route and exposes no public email signup", () => {
    expect(AUTH_ROUTE_PATH).toBe("/api/auth");
    expect(PUBLIC_EMAIL_SIGN_UP_ENABLED).toBe(false);
  });
});
