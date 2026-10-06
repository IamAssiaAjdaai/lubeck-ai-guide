import { getCitywalkSocialAuthConfiguration } from "@/lib/auth/socialProviders.server";
import { createAppleTokenRevocationEraser } from "@/lib/auth/lifecycle/appleTokenRevocation.server";
import { processExternalAccountErasureJobs } from "@/lib/auth/lifecycle/externalAccountErasureWorker.server";
import { createRevenueCatCustomerEraser } from "@/lib/commerce/revenueCatCustomerErasure.server";

export type AccountErasureScheduleEnvironment = Readonly<{
  BETTER_AUTH_SECRET?: string;
  COMMERCE_REVENUECAT_SECRET_API_KEY?: string;
  CITYWALK_APPLE_OAUTH_CLIENT_ID?: string;
  CITYWALK_APPLE_TEAM_ID?: string;
  CITYWALK_APPLE_KEY_ID?: string;
  CITYWALK_APPLE_PRIVATE_KEY?: string;
  CITYWALK_APPLE_APP_BUNDLE_IDENTIFIER?: string;
}>;

const REQUIRED_ENV_KEYS = [
  "BETTER_AUTH_SECRET",
  "COMMERCE_REVENUECAT_SECRET_API_KEY",
  "CITYWALK_APPLE_OAUTH_CLIENT_ID",
  "CITYWALK_APPLE_TEAM_ID",
  "CITYWALK_APPLE_KEY_ID",
  "CITYWALK_APPLE_PRIVATE_KEY",
  "CITYWALK_APPLE_APP_BUNDLE_IDENTIFIER",
] as const;

export function isAccountErasureScheduleConfigured(
  env: AccountErasureScheduleEnvironment,
): boolean {
  return REQUIRED_ENV_KEYS.every((key) => Boolean(env[key]?.trim()));
}

export async function runScheduledAccountErasures(
  env: AccountErasureScheduleEnvironment,
): Promise<
  | Readonly<{ status: "skipped_not_configured" }>
  | Readonly<{
      status: "processed";
      claimed: number;
      completed: number;
      failed: number;
      lostLeases: number;
    }>
> {
  if (!isAccountErasureScheduleConfigured(env)) {
    return { status: "skipped_not_configured" };
  }

  const appleProviderFactory =
    getCitywalkSocialAuthConfiguration(env).socialProviders.apple;
  if (!appleProviderFactory) {
    return { status: "skipped_not_configured" };
  }

  const result = await processExternalAccountErasureJobs({
    erasers: [
      createRevenueCatCustomerEraser({
        apiKey: env.COMMERCE_REVENUECAT_SECRET_API_KEY,
      }),
      createAppleTokenRevocationEraser({
        secret: env.BETTER_AUTH_SECRET,
        getProvider: async () => {
          const provider = await appleProviderFactory();
          return {
            clientId: provider.clientId,
            clientSecret: provider.clientSecret,
          };
        },
      }),
    ],
  });

  return { status: "processed", ...result };
}
