import { loadDatabaseEnvironment } from "@/db/loadEnvironment";

loadDatabaseEnvironment();

async function main() {
  const [
    { closeDb },
    { getDatabaseUrl },
    { seedLubeckDatabase },
  ] = await Promise.all([
    import("@/db/client"),
    import("@/db/env"),
    import("@/db/seed"),
  ]);

  try {
    getDatabaseUrl();
    const result = await seedLubeckDatabase();
    console.log(`Seeded Lübeck: ${result.placeCount} places`);
  } catch {
    console.error(
      "Database seed failed. Check DATABASE_URL and PostgreSQL availability.",
    );
    process.exitCode = 1;
  } finally {
    await closeDb();
  }
}

void main();
