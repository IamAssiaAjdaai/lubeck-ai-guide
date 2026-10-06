import { loadDatabaseEnvironment } from "@/db/loadEnvironment";

loadDatabaseEnvironment();

async function main(): Promise<void> {
  if (!process.env.COMMERCE_REVENUECAT_SECRET_API_KEY?.trim()) {
    throw new Error("COMMERCE_REVENUECAT_SECRET_API_KEY is required.");
  }

  const [
    { closeDb },
    { processExternalAccountErasureJobs },
    { createAppleTokenRevocationEraser },
    { createRevenueCatCustomerEraser },
  ] = await Promise.all([
    import("@/db/client"),
    import("@/lib/auth/lifecycle/externalAccountErasureWorker.server"),
    import("@/lib/auth/lifecycle/appleTokenRevocation.server"),
    import("@/lib/commerce/revenueCatCustomerErasure.server"),
  ]);

  try {
    const result = await processExternalAccountErasureJobs({
      erasers: [
        createRevenueCatCustomerEraser(),
        createAppleTokenRevocationEraser(),
      ],
    });
    console.log(JSON.stringify(result));
  } finally {
    await closeDb();
  }
}

void main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : "External account erasure worker failed.",
  );
  process.exitCode = 1;
});
