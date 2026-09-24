import { closeDb } from "@/db/client";
import { loadDatabaseEnvironment } from "@/db/loadEnvironment";
import {
  getCityReadinessMatrix,
  getCityReadinessReport,
} from "@/lib/content/cityReadiness.server";

loadDatabaseEnvironment();

async function main() {
  const citySlug = process.argv.find((argument) => argument.startsWith("--city="))
    ?.slice("--city=".length);
  if (citySlug) {
    const report = await getCityReadinessReport(citySlug);
    console.log(JSON.stringify(report, null, 2));
    if (!report.launchReady) {
      console.log(`Launch blocked: ${report.blockers.join(", ")}`);
    }
    return;
  }

  const matrix = await getCityReadinessMatrix();
  console.log(JSON.stringify(matrix, null, 2));
  for (const report of matrix) {
    if (!report.launchReady) {
      console.log(`${report.citySlug} blocked: ${report.blockers.join(", ")}`);
    }
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Readiness check failed.");
    process.exitCode = 1;
  })
  .finally(async () => closeDb());
