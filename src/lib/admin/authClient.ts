"use client";

import { passkeyClient } from "@better-auth/passkey/client";
import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

export const adminAuthClient = createAuthClient({
  plugins: [
    passkeyClient(),
    twoFactorClient({
      twoFactorPage: "/admin/two-factor",
    }),
  ],
});
