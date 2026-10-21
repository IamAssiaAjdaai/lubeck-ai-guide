import { betterAuth } from "better-auth";
import type { Pool } from "pg";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { configuration } from "./config";
export type MailMessage = { to: string; url: string; kind: "verify" | "reset" };
export function createSaasAuth(pool: Pool, config: ReturnType<typeof configuration>, sink?: (message: MailMessage) => Promise<void>) {
  const deliver = sink ?? (async (message: MailMessage) => {
    await mkdir(config.mailDirectory, { recursive: true, mode: 0o700 });
    await writeFile(join(config.mailDirectory, randomUUID() + ".json"), JSON.stringify(message), { mode: 0o600 });
  });
  return betterAuth({
    appName: "Marketing Workspace", baseURL: config.origin, basePath: "/api/auth",
    secret: config.secret, database: pool, trustedOrigins: [config.origin],
    emailAndPassword: { enabled: true, minPasswordLength: 12, maxPasswordLength: 128,
      requireEmailVerification: true, autoSignIn: false, revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => deliver({ to: user.email, url, kind: "reset" }),
    },
    emailVerification: { sendOnSignUp: true, sendOnSignIn: true, expiresIn: 1800,
      sendVerificationEmail: async ({ user, url }) => deliver({ to: user.email, url, kind: "verify" }),
    },
    advanced: { ipAddress: { ipAddressHeaders: ["x-marketing-client-ip"] }, cookiePrefix: "marketing-saas", useSecureCookies: false,
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", path: "/" } },
    session: { expiresIn: 60 * 60 * 24 * 7, cookieCache: { enabled: false } },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 30 },
  });
}
