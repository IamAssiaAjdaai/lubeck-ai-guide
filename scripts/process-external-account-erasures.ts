import { loadDatabaseEnvironment } from "@/db/loadEnvironment";

loadDatabaseEnvironment();

async function main(): Promise<void> {
  const [
    { closeDb },
    { runScheduledAccountErasures },
  ] = await Promise.all([
    import("@/db/client"),
    import("@/cloudflare/accountErasureSchedule"),
  ]);

  try {
    const result = await runScheduledAccountErasures({
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
      COMMERCE_REVENUECAT_SECRET_API_KEY: process.env.COMMERCE_REVENUECAT_SECRET_API_KEY,
      CITYWALK_APPLE_OAUTH_CLIENT_ID: process.env.CITYWALK_APPLE_OAUTH_CLIENT_ID,
      CITYWALK_APPLE_TEAM_ID: process.env.CITYWALK_APPLE_TEAM_ID,
      CITYWALK_APPLE_KEY_ID: process.env.CITYWALK_APPLE_KEY_ID,
      CITYWALK_APPLE_PRIVATE_KEY: process.env.CITYWALK_APPLE_PRIVATE_KEY,
      CITYWALK_APPLE_APP_BUNDLE_IDENTIFIER: process.env.CITYWALK_APPLE_APP_BUNDLE_IDENTIFIER,
    });
    if (result.status === "processed" && Object.keys(result.providers).length < 2) {
      console.warn("ACCOUNT_ERASURE_PROVIDERS_UNAVAILABLE");
    }
    console.log(JSON.stringify(result));
    if (result.status === "skipped_not_configured" || result.failed || result.lostLeases) process.exitCode = 1;
  } finally {
    await closeDb();
  }
}

void main().catch(() => {
  console.error("ACCOUNT_ERASURE_SCHEDULE_FAILED");
  process.exitCode = 1;
});
