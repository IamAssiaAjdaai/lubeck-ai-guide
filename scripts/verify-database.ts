import { loadDatabaseEnvironment } from "@/db/loadEnvironment";

loadDatabaseEnvironment();

async function main() {
  const [
    { closeDb, getDb },
    { getDatabaseUrl },
    { citiesTable, placesTable },
    { verifyDatabaseCatalogSnapshot },
  ] = await Promise.all([
    import("@/db/client"),
    import("@/db/env"),
    import("@/db/schema"),
    import("@/db/verification"),
  ]);

  try {
    getDatabaseUrl();
    const db = getDb();
    const [cities, places] = await Promise.all([
      db.select().from(citiesTable),
      db.select().from(placesTable),
    ]);
    const result = verifyDatabaseCatalogSnapshot(cities, places);
    const cityLabel = result.cityCount === 1 ? "city" : "cities";

    console.log(
      `Verified database catalog: ${result.cityCount} ${cityLabel}, ${result.placeCount} places.`,
    );
    for (const city of result.cities) {
      console.log(
        `- ${city.slug}: ${city.placeCount} places (${city.categoryCounts.see} See, ${city.categoryCounts.eat} Eat, ${city.categoryCounts.fun} Fun; ${city.curatedHiddenGemCount} curated Hidden Gems)`,
      );
    }
  } catch {
    console.error(
      "Database verification failed. Check migration, seed data, DATABASE_URL, and PostgreSQL availability.",
    );
    process.exitCode = 1;
  } finally {
    await closeDb();
  }
}

void main();
