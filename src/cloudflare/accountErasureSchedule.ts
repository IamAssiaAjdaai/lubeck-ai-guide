import { getCitywalkSocialAuthConfiguration } from "@/lib/auth/socialProviders.server";
import { createAppleTokenRevocationEraser, AppleTokenRevocationError } from "@/lib/auth/lifecycle/appleTokenRevocation.server";
import { processExternalAccountErasureJobs, type ExternalAccountErasureWorkerResult } from "@/lib/auth/lifecycle/externalAccountErasureWorker.server";
import { createRevenueCatCustomerEraser } from "@/lib/commerce/revenueCatCustomerErasure.server";
import {
  configuredAccountErasureProviders,
  type AccountErasureProvider,
  type AccountErasureScheduleEnvironment,
} from "./accountErasureScheduleConfig";

export type AccountErasureScheduleResult =
  | Readonly<{ status: "skipped_not_configured" }>
  | (ExternalAccountErasureWorkerResult & Readonly<{
      status: "processed";
      providers: Partial<Record<AccountErasureProvider, ExternalAccountErasureWorkerResult>>;
    }>);

export async function runScheduledAccountErasures(
  env: AccountErasureScheduleEnvironment,
): Promise<AccountErasureScheduleResult> {
  const configured = configuredAccountErasureProviders(env);
  if (!configured.length) return { status: "skipped_not_configured" };

  const providers: Partial<Record<AccountErasureProvider, ExternalAccountErasureWorkerResult>> = {};
  const totals = { claimed: 0, completed: 0, failed: 0, lostLeases: 0 };
  try {
    for (const provider of configured) {
      const eraser = provider === "revenuecat"
        ? createRevenueCatCustomerEraser({ apiKey: env.COMMERCE_REVENUECAT_SECRET_API_KEY })
        : createAppleTokenRevocationEraser({
            secret: env.BETTER_AUTH_SECRET,
            // Resolve/sign within the per-job failure boundary. Bad Apple key material
            // cannot prevent RevenueCat work, nor can unrelated Google configuration.
            getProvider: async () => {
              const factory = getCitywalkSocialAuthConfiguration({
                CITYWALK_APPLE_OAUTH_CLIENT_ID: env.CITYWALK_APPLE_OAUTH_CLIENT_ID,
                CITYWALK_APPLE_TEAM_ID: env.CITYWALK_APPLE_TEAM_ID,
                CITYWALK_APPLE_KEY_ID: env.CITYWALK_APPLE_KEY_ID,
                CITYWALK_APPLE_PRIVATE_KEY: env.CITYWALK_APPLE_PRIVATE_KEY,
                CITYWALK_APPLE_APP_BUNDLE_IDENTIFIER: env.CITYWALK_APPLE_APP_BUNDLE_IDENTIFIER,
              }).socialProviders.apple;
              if (!factory) throw new AppleTokenRevocationError("NOT_CONFIGURED");
              const credentials = await factory();
              return { clientId: credentials.clientId, clientSecret: credentials.clientSecret };
            },
          });
      // Separate bounded batches prevent a failing provider backlog starving the other.
      const result = await processExternalAccountErasureJobs({ erasers: [eraser], batchSize: 10 });
      providers[provider] = result;
      totals.claimed += result.claimed;
      totals.completed += result.completed;
      totals.failed += result.failed;
      totals.lostLeases += result.lostLeases;
    }
  } catch {
    // Never let a DB/SDK error escape to scheduler logs with raw connection data.
    throw new Error("ACCOUNT_ERASURE_SCHEDULE_FAILED");
  }
  return { status: "processed", ...totals, providers };
}
