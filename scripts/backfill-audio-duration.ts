import { loadDatabaseEnvironment } from "@/db/loadEnvironment";

loadDatabaseEnvironment();

async function main() {
  const [{ closeDb }, { backfillAudioDurations }] = await Promise.all([
    import("@/db/client"),
    import("@/lib/media/backfillAudioDuration.server"),
  ]);

  try {
    const result = await backfillAudioDurations();
    console.log(
      `Audio duration backfill: scanned=${result.scanned} updated=${result.updated} skipped=${result.skipped} failed=${result.failed}`,
    );
  } catch (error) {
    console.error("Audio duration backfill could not be completed.");
    if (process.env.NODE_ENV !== "production") {
      console.error(error instanceof Error ? error.name : "unknown_error");
    }
    process.exitCode = 1;
  } finally {
    await closeDb();
  }
}

void main();
