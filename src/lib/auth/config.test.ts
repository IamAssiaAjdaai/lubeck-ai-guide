import { describe, expect, it } from "vitest";

import {
  AUTH_ROUTE_PATH,
  NATIVE_AUTH_TRUSTED_ORIGINS,
  PUBLIC_EMAIL_SIGN_UP_ENABLED,
} from "@/lib/auth/factory.server";

describe("Better Auth configuration", () => {
  it("uses the official auth route and enables guest-first traveler signup", () => {
    expect(AUTH_ROUTE_PATH).toBe("/api/auth");
    expect(PUBLIC_EMAIL_SIGN_UP_ENABLED).toBe(true);
  });

  it("declares only the CITYWALK scheme as an application callback origin", () => {
    expect(NATIVE_AUTH_TRUSTED_ORIGINS).toEqual([
      "citywalk://",
      "citywalk://*",
    ]);
    expect(NATIVE_AUTH_TRUSTED_ORIGINS.join(" ")).not.toContain("http");
    expect(NATIVE_AUTH_TRUSTED_ORIGINS.join(" ")).not.toContain("exp://");
  });
});
