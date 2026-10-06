import { getCitywalkSocialAuthConfiguration } from "@/lib/auth/socialProviders.server";
import { createAppleTokenRevocationEraser } from "@/lib/auth/lifecycle/appleTokenRevocation.server";
import { processExternalAccountErasureJobs } from "@/lib/auth/lifecycle/externalAccountErasureWorker.server";
import { createRevenueCatCustomerEraser } from "@/lib/commerce/revenueCatCustomerErasure.server";
import {
  isAccountErasureScheduleConfigured,
  type AccountErasureScheduleEnvironment,
} from "./accountErasureScheduleConfig";

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
