import { eq, inArray } from "drizzle-orm";

import { loadDatabaseEnvironment } from "@/db/loadEnvironment";

loadDatabaseEnvironment();

async function main() {
  const [
    { closeDb, getDb },
    { getDatabaseUrl },
    { citiesTable, placesTable },
    { lubeckCitySeed },
    { verifyLubeckDatabaseSnapshot },
  ] = await Promise.all([
    import("@/db/client"),
    import("@/db/env"),
    import("@/db/schema"),
    import("@/db/seedData"),
    import("@/db/verification"),
  ]);

  try {
    getDatabaseUrl();
    const db = getDb();
    const cities = await db
      .select()
      .from(citiesTable)
      .where(eq(citiesTable.slug, String(lubeckCitySeed.slug)));
    const cityIds = cities.map((city) => city.id);
    const places =
      cityIds.length === 0
        ? []
        : await db
            .select()
            .from(placesTable)
            .where(inArray(placesTable.cityId, cityIds));
    const result = verifyLubeckDatabaseSnapshot(cities, places);

    console.log(
      `Verified Lübeck: ${result.cityCount} city, ${result.placeCount} places (${result.categoryCounts.see} See, ${result.categoryCounts.eat} Eat, ${result.categoryCounts.fun} Fun; ${result.curatedHiddenGemCount} curated Hidden Gems)`,
    );
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
